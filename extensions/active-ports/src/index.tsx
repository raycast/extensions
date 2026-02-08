import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Color,
  confirmAlert,
  Alert,
  Form,
  useNavigation,
  LocalStorage,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { execSync, exec } from "child_process";
import { useState, useEffect, useCallback } from "react";

const HIDDEN_PORTS_KEY = "hidden-ports";

interface PortInfo {
  port: number;
  pid: number;
  command: string;
  user: string;
  displayName: string;
  projectPath?: string;
  cwd?: string;
  pageTitle?: string;
  // Service detection flags
  isVite: boolean;
  isDevServer: boolean;
  isFastAPI: boolean;
  isFlask: boolean;
  isNextJS: boolean;
  isSvelteKit: boolean;
  // Docker info
  dockerContainer?: string;
  dockerImage?: string;
}

interface ServiceFlags {
  isVite: boolean;
  isFastAPI: boolean;
  isFlask: boolean;
  isNextJS: boolean;
  isSvelteKit: boolean;
  isDevServer: boolean;
}

function detectServiceType(command: string): ServiceFlags {
  const isVite = /vite|@vitejs/i.test(command);
  const isFastAPI = /uvicorn|fastapi/i.test(command);
  const isFlask = /flask/i.test(command);
  const isNextJS = /next-server|next dev|next start/i.test(command);
  const isSvelteKit = /svelte/i.test(command);
  const isDevServer =
    isVite ||
    isNextJS ||
    isSvelteKit ||
    /webpack|nuxt|nuxi|remix|astro/i.test(command);

  return { isVite, isFastAPI, isFlask, isNextJS, isSvelteKit, isDevServer };
}

interface DockerInfo {
  container: string;
  image: string;
}

function getDockerPorts(): Map<number, DockerInfo> {
  const portMap = new Map<number, DockerInfo>();
  try {
    const output = execSync(
      "docker ps --format '{{.Names}}\t{{.Ports}}\t{{.Image}}' 2>/dev/null",
      {
        encoding: "utf-8",
      },
    );
    for (const line of output.split("\n")) {
      if (!line.trim()) continue;
      const [container, ports, image] = line.split("\t");
      // Parse port mappings like "0.0.0.0:3000->3000/tcp, :::3000->3000/tcp"
      const portMatches = ports.matchAll(/(?:\d+\.\d+\.\d+\.\d+|::):(\d+)->/g);
      for (const match of portMatches) {
        portMap.set(parseInt(match[1], 10), { container, image });
      }
    }
  } catch {
    // Docker not running or not installed
  }
  return portMap;
}

/** Extract a smart display name from command/path */
function getDisplayName(
  command: string,
  cwd?: string,
): { name: string; project?: string } {
  // macOS .app bundle
  const appMatch = command.match(/\/([^/]+)\.app\//);
  if (appMatch) {
    return { name: appMatch[1] };
  }

  // For cwd, get the last folder name (the actual project folder)
  if (cwd) {
    const folders = cwd.split("/").filter(Boolean);
    const lastFolder = folders[folders.length - 1];
    if (
      lastFolder &&
      !["node_modules", ".bin", "src", "dist"].includes(lastFolder)
    ) {
      return { name: lastFolder, project: cwd };
    }
  }

  // Node/bun with project path - get the last meaningful folder
  const nodePathMatch = command.match(/(?:node|bun|tsx|ts-node)\s+([^\s]+)/);
  if (nodePathMatch) {
    const parts = nodePathMatch[1].split("/").filter(Boolean);
    // Find the project folder (skip node_modules, .bin, etc)
    for (let i = parts.length - 1; i >= 0; i--) {
      if (
        !["node_modules", ".bin", "src", "dist", "bin"].includes(parts[i]) &&
        !parts[i].endsWith(".js")
      ) {
        return { name: parts[i], project: nodePathMatch[1] };
      }
    }
  }

  // Python script
  const pythonMatch = command.match(/python[3]?\s+(?:.*\/)?([^/\s]+\.py)/);
  if (pythonMatch) {
    return { name: pythonMatch[1] };
  }

  // Just the binary name for system processes
  const binaryMatch = command.match(/^\/[^\s]+\/([^/\s]+)/);
  if (binaryMatch) {
    return { name: binaryMatch[1] };
  }

  // First word as fallback
  const firstWord = command.split(/\s+/)[0];
  return { name: firstWord.split("/").pop() || command.slice(0, 20) };
}

/** Generic titles that aren't useful to display */
const GENERIC_TITLES = [
  "vite",
  "vite app",
  "vite + react",
  "vite + vue",
  "vite + svelte",
  "webpack",
  "next.js",
  "nuxt",
  "localhost",
  "index",
  "home",
  "untitled",
];

/** Try to fetch page title from HTTP server */
async function fetchPageTitle(port: number): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);

    const response = await fetch(`http://localhost:${port}`, {
      signal: controller.signal,
      headers: { Accept: "text/html" },
    });
    clearTimeout(timeout);

    if (!response.ok) return undefined;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return undefined;

    const text = await response.text();
    const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim().slice(0, 50);

    // Skip generic/useless titles
    if (!title || GENERIC_TITLES.includes(title.toLowerCase())) {
      return undefined;
    }

    return title;
  } catch {
    return undefined;
  }
}

async function getActivePorts(): Promise<PortInfo[]> {
  const output = execSync("/usr/sbin/lsof -iTCP -sTCP:LISTEN -P -n -F pcLn", {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, PATH: "/usr/sbin:/usr/bin:/bin:/sbin" },
  });

  if (!output?.trim()) return [];

  // Get Docker port mappings upfront
  const dockerPorts = getDockerPorts();

  const portMap = new Map<string, PortInfo>();
  let currentPid = 0;
  let currentCommand = "";
  let currentUser = "";

  for (const line of output.split("\n")) {
    if (!line) continue;
    const type = line[0];
    const value = line.slice(1);

    switch (type) {
      case "p":
        currentPid = parseInt(value, 10);
        break;
      case "c":
        currentCommand = value;
        break;
      case "L":
        currentUser = value;
        break;
      case "n": {
        const portMatch = value.match(/:(\d+)$/);
        if (!portMatch) break;

        const port = parseInt(portMatch[1], 10);
        const key = String(port);
        if (portMap.has(key)) break;

        let cwd: string | undefined;
        let fullCommand = currentCommand;

        try {
          cwd =
            execSync(
              `/usr/sbin/lsof -p ${currentPid} -Fn 2>/dev/null | awk '/^fcwd/{getline; print substr($0,2)}'`,
              { encoding: "utf-8" },
            ).trim() || undefined;

          fullCommand =
            execSync(`/bin/ps -p ${currentPid} -o args= 2>/dev/null`, {
              encoding: "utf-8",
            }).trim() || currentCommand;
        } catch {
          // ignore
        }

        const serviceFlags = detectServiceType(fullCommand);
        const dockerInfo = dockerPorts.get(port);
        const { name, project } = getDisplayName(fullCommand, cwd);

        portMap.set(key, {
          port,
          pid: currentPid,
          command: fullCommand,
          user: currentUser,
          displayName: name,
          projectPath: project || cwd,
          cwd,
          ...serviceFlags,
          dockerContainer: dockerInfo?.container,
          dockerImage: dockerInfo?.image,
        });
        break;
      }
    }
  }

  return Array.from(portMap.values()).sort((a, b) => a.port - b.port);
}

async function killProcess(pid: number, port: number): Promise<boolean> {
  const confirmed = await confirmAlert({
    title: "Kill Process",
    message: `Kill process ${pid} on port ${port}?`,
    primaryAction: { title: "Kill", style: Alert.ActionStyle.Destructive },
  });

  if (!confirmed) return false;

  try {
    execSync(`kill -9 ${pid} 2>/dev/null`);
    await showToast({
      style: Toast.Style.Success,
      title: `Killed process on port ${port}`,
    });
    return true;
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to kill process",
    });
    return false;
  }
}

function RestartViteForm({
  info,
  onRestart,
}: {
  info: PortInfo;
  onRestart: () => void;
}) {
  const { pop } = useNavigation();
  const [newPort, setNewPort] = useState(String(info.port + 1));

  async function handleSubmit() {
    const port = parseInt(newPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid port number",
      });
      return;
    }

    try {
      execSync(`kill -9 ${info.pid} 2>/dev/null`);
    } catch {
      // Process may already be dead
    }

    const cwd = info.cwd || process.cwd();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting Vite...",
    });

    exec(`cd "${cwd}" && npm run dev -- --port ${port}`, (error) => {
      if (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to start Vite";
      }
    });

    await new Promise((r) => setTimeout(r, 1500));
    toast.style = Toast.Style.Success;
    toast.title = `Vite restarting on port ${port}`;

    onRestart();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Restart Vite"
            onSubmit={handleSubmit}
            icon={Icon.ArrowClockwise}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Restart Vite server from: ${info.cwd || "unknown"}`}
      />
      <Form.TextField
        id="port"
        title="New Port"
        placeholder="3001"
        value={newPort}
        onChange={setNewPort}
      />
    </Form>
  );
}

function RestartFastAPIForm({
  info,
  onRestart,
}: {
  info: PortInfo;
  onRestart: () => void;
}) {
  const { pop } = useNavigation();
  const [newPort, setNewPort] = useState(String(info.port + 1));
  const [reload, setReload] = useState(true);

  async function handleSubmit() {
    const port = parseInt(newPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid port number",
      });
      return;
    }

    try {
      execSync(`kill -9 ${info.pid} 2>/dev/null`);
    } catch {
      // Process may already be dead
    }

    const cwd = info.cwd || process.cwd();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting Uvicorn...",
    });
    const reloadFlag = reload ? " --reload" : "";

    // Extract the app module from the command (e.g., "main:app")
    const appMatch = info.command.match(/uvicorn\s+([^\s]+)/);
    const appModule = appMatch?.[1] || "main:app";

    exec(
      `cd "${cwd}" && uvicorn ${appModule} --port ${port}${reloadFlag}`,
      (error) => {
        if (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to start Uvicorn";
        }
      },
    );

    await new Promise((r) => setTimeout(r, 1500));
    toast.style = Toast.Style.Success;
    toast.title = `Uvicorn restarting on port ${port}`;

    onRestart();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Restart Uvicorn"
            onSubmit={handleSubmit}
            icon={Icon.ArrowClockwise}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Restart Uvicorn from: ${info.cwd || "unknown"}`}
      />
      <Form.TextField
        id="port"
        title="New Port"
        placeholder="8001"
        value={newPort}
        onChange={setNewPort}
      />
      <Form.Checkbox
        id="reload"
        label="Enable --reload flag"
        value={reload}
        onChange={setReload}
      />
    </Form>
  );
}

function RestartNextJSForm({
  info,
  onRestart,
}: {
  info: PortInfo;
  onRestart: () => void;
}) {
  const { pop } = useNavigation();
  const [newPort, setNewPort] = useState(String(info.port + 1));

  async function handleSubmit() {
    const port = parseInt(newPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid port number",
      });
      return;
    }

    try {
      execSync(`kill -9 ${info.pid} 2>/dev/null`);
    } catch {
      // Process may already be dead
    }

    const cwd = info.cwd || process.cwd();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting Next.js...",
    });

    exec(`cd "${cwd}" && npm run dev -- --port ${port}`, (error) => {
      if (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to start Next.js";
      }
    });

    await new Promise((r) => setTimeout(r, 2000));
    toast.style = Toast.Style.Success;
    toast.title = `Next.js restarting on port ${port}`;

    onRestart();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Restart Next.js"
            onSubmit={handleSubmit}
            icon={Icon.ArrowClockwise}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Restart Next.js from: ${info.cwd || "unknown"}`}
      />
      <Form.TextField
        id="port"
        title="New Port"
        placeholder="3001"
        value={newPort}
        onChange={setNewPort}
      />
    </Form>
  );
}

function RestartFlaskForm({
  info,
  onRestart,
}: {
  info: PortInfo;
  onRestart: () => void;
}) {
  const { pop } = useNavigation();
  const [newPort, setNewPort] = useState(String(info.port + 1));
  const [debug, setDebug] = useState(true);

  async function handleSubmit() {
    const port = parseInt(newPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid port number",
      });
      return;
    }

    try {
      execSync(`kill -9 ${info.pid} 2>/dev/null`);
    } catch {
      // Process may already be dead
    }

    const cwd = info.cwd || process.cwd();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting Flask...",
    });
    const debugFlag = debug ? " --debug" : "";

    exec(`cd "${cwd}" && flask run --port ${port}${debugFlag}`, (error) => {
      if (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to start Flask";
      }
    });

    await new Promise((r) => setTimeout(r, 1500));
    toast.style = Toast.Style.Success;
    toast.title = `Flask restarting on port ${port}`;

    onRestart();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Restart Flask"
            onSubmit={handleSubmit}
            icon={Icon.ArrowClockwise}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Restart Flask from: ${info.cwd || "unknown"}`} />
      <Form.TextField
        id="port"
        title="New Port"
        placeholder="5001"
        value={newPort}
        onChange={setNewPort}
      />
      <Form.Checkbox
        id="debug"
        label="Enable --debug flag"
        value={debug}
        onChange={setDebug}
      />
    </Form>
  );
}

async function getHiddenPorts(): Promise<number[]> {
  const stored = await LocalStorage.getItem<string>(HIDDEN_PORTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

async function setHiddenPorts(ports: number[]): Promise<void> {
  await LocalStorage.setItem(HIDDEN_PORTS_KEY, JSON.stringify(ports));
}

async function dockerAction(action: string, container: string): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Running docker ${action}...`,
  });
  try {
    execSync(`docker ${action} ${container}`, { encoding: "utf-8" });
    toast.style = Toast.Style.Success;
    toast.title = `Container ${action} completed`;
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to ${action} container`;
  }
}

async function runSvelteKitPreview(cwd: string, pid: number): Promise<void> {
  try {
    execSync(`kill -9 ${pid} 2>/dev/null`);
  } catch {
    // Process may already be dead
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Building and starting preview...",
  });

  exec(`cd "${cwd}" && npm run build && npm run preview`, (error) => {
    if (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to start preview";
    }
  });

  await new Promise((r) => setTimeout(r, 3000));
  toast.style = Toast.Style.Success;
  toast.title = "SvelteKit preview starting";
}

function PortListItem({
  info,
  revalidate,
  onHide,
  onUnhide,
  isHiddenView = false,
}: {
  info: PortInfo;
  revalidate: () => void;
  onHide?: (port: number) => void;
  onUnhide?: (port: number) => void;
  isHiddenView?: boolean;
}) {
  const [pageTitle, setPageTitle] = useState<string | undefined>();

  useEffect(() => {
    if (info.isDevServer) {
      fetchPageTitle(info.port).then(setPageTitle);
    }
  }, [info.port, info.isDevServer]);

  const icon = (() => {
    if (info.dockerContainer)
      return { source: Icon.Box, tintColor: Color.Blue };
    if (info.isVite || info.isSvelteKit)
      return { source: Icon.Bolt, tintColor: Color.Purple };
    if (info.isNextJS) return { source: Icon.Code, tintColor: Color.Green };
    if (info.isFastAPI) return { source: Icon.Rocket, tintColor: Color.Orange };
    if (info.isFlask) return { source: Icon.Beaker, tintColor: Color.Green };
    if (info.isDevServer) return { source: Icon.Code, tintColor: Color.Green };
    if (info.command.includes("python"))
      return { source: Icon.Code, tintColor: Color.Yellow };
    if (info.command.includes(".app/"))
      return { source: Icon.AppWindow, tintColor: Color.SecondaryText };
    return { source: Icon.Network, tintColor: Color.SecondaryText };
  })();

  const title = pageTitle || info.displayName;
  const subtitle = info.dockerContainer
    ? `Container: ${info.dockerContainer}`
    : info.projectPath
      ? info.projectPath
          .replace(/^\/Users\/[^/]+\//, "~/")
          .replace(/\/node_modules\/.*/, "")
      : undefined;

  const accessories: { tag: { value: string; color: Color } }[] = [
    {
      tag: {
        value: `:${info.port}`,
        color:
          info.isDevServer || info.isFastAPI || info.isFlask
            ? Color.Green
            : Color.SecondaryText,
      },
    },
  ];
  if (info.dockerContainer)
    accessories.push({ tag: { value: "Docker", color: Color.Blue } });
  if (info.isVite)
    accessories.push({ tag: { value: "Vite", color: Color.Purple } });
  if (info.isSvelteKit)
    accessories.push({ tag: { value: "SvelteKit", color: Color.Orange } });
  if (info.isNextJS)
    accessories.push({ tag: { value: "Next.js", color: Color.SecondaryText } });
  if (info.isFastAPI)
    accessories.push({ tag: { value: "FastAPI", color: Color.Orange } });
  if (info.isFlask)
    accessories.push({ tag: { value: "Flask", color: Color.Green } });

  return (
    <List.Item
      key={`${info.port}-${info.pid}`}
      icon={icon}
      title={title}
      subtitle={subtitle}
      accessories={accessories}
      keywords={[
        String(info.port),
        info.displayName,
        info.command,
        info.dockerContainer || "",
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.OpenInBrowser
              title="Open in Browser"
              url={`http://localhost:${info.port}`}
              icon={Icon.Globe}
            />
            {info.isFastAPI && (
              <>
                <Action.OpenInBrowser
                  title="Open Api Docs (swagger)"
                  url={`http://localhost:${info.port}/docs`}
                  icon={Icon.Document}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                <Action.OpenInBrowser
                  title="Open Redoc"
                  url={`http://localhost:${info.port}/redoc`}
                  icon={Icon.Book}
                />
              </>
            )}
            <Action
              title="Kill Process"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
              onAction={async () => {
                if (await killProcess(info.pid, info.port)) revalidate();
              }}
            />
          </ActionPanel.Section>

          {/* Service-specific restart actions */}
          {(info.isVite ||
            info.isFastAPI ||
            info.isNextJS ||
            info.isFlask ||
            info.isSvelteKit) &&
            info.cwd && (
              <ActionPanel.Section title="Restart">
                {info.isVite && (
                  <Action.Push
                    title="Restart Vite on Different Port"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    target={
                      <RestartViteForm info={info} onRestart={revalidate} />
                    }
                  />
                )}
                {info.isFastAPI && (
                  <Action.Push
                    title="Restart Uvicorn on Different Port"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    target={
                      <RestartFastAPIForm info={info} onRestart={revalidate} />
                    }
                  />
                )}
                {info.isNextJS && (
                  <Action.Push
                    title="Restart Next.js on Different Port"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    target={
                      <RestartNextJSForm info={info} onRestart={revalidate} />
                    }
                  />
                )}
                {info.isFlask && (
                  <Action.Push
                    title="Restart Flask on Different Port"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    target={
                      <RestartFlaskForm info={info} onRestart={revalidate} />
                    }
                  />
                )}
                {info.isSvelteKit && (
                  <Action
                    title="Build and Run Preview"
                    icon={Icon.Play}
                    onAction={async () => {
                      await runSvelteKitPreview(info.cwd!, info.pid);
                      revalidate();
                    }}
                  />
                )}
              </ActionPanel.Section>
            )}

          {/* Docker-specific actions */}
          {info.dockerContainer && (
            <ActionPanel.Section title="Docker">
              <Action
                title="Restart Container"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={async () => {
                  await dockerAction("restart", info.dockerContainer!);
                  revalidate();
                }}
              />
              <Action
                title="View Logs in Terminal"
                icon={Icon.Terminal}
                onAction={() => {
                  exec(
                    `open -a Terminal -n --args -c "docker logs -f ${info.dockerContainer}"`,
                  );
                }}
              />
              <Action
                title="Stop Container"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                onAction={async () => {
                  await dockerAction("stop", info.dockerContainer!);
                  revalidate();
                }}
              />
              <Action
                title="Open Shell in Container"
                icon={Icon.Terminal}
                onAction={() => {
                  exec(
                    `open -a Terminal -n --args -c "docker exec -it ${info.dockerContainer} sh"`,
                  );
                }}
              />
            </ActionPanel.Section>
          )}

          {info.cwd && (
            <ActionPanel.Section title="Open">
              <Action.Open
                title="Open in Terminal"
                target={info.cwd}
                application="com.apple.Terminal"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            </ActionPanel.Section>
          )}

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy URL"
              content={`http://localhost:${info.port}`}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Port"
              content={String(info.port)}
            />
            <Action.CopyToClipboard
              title="Copy Pid"
              content={String(info.pid)}
            />
            {info.cwd && (
              <Action.CopyToClipboard title="Copy Path" content={info.cwd} />
            )}
            {info.dockerContainer && (
              <Action.CopyToClipboard
                title="Copy Container Name"
                content={info.dockerContainer}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={revalidate}
            />
            {!isHiddenView && onHide && (
              <Action
                title="Hide This Service"
                icon={Icon.EyeDisabled}
                shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                onAction={() => onHide(info.port)}
              />
            )}
            {isHiddenView && onUnhide && (
              <Action
                title="Unhide This Service"
                icon={Icon.Eye}
                shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                onAction={() => onUnhide(info.port)}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function HiddenServicesView({
  allPorts,
  hiddenPorts,
  onUnhide,
  revalidate,
}: {
  allPorts: PortInfo[];
  hiddenPorts: number[];
  onUnhide: (port: number) => void;
  revalidate: () => void;
}) {
  const hidden = allPorts.filter((p) => hiddenPorts.includes(p.port));

  return (
    <List searchBarPlaceholder="Filter hidden services...">
      {hidden.length === 0 ? (
        <List.EmptyView
          title="No Hidden Services"
          description="Services you hide will appear here"
          icon={Icon.EyeDisabled}
        />
      ) : (
        <List.Section title="Hidden Services" subtitle={`${hidden.length}`}>
          {hidden.map((info) => (
            <PortListItem
              key={`${info.port}-${info.pid}`}
              info={info}
              revalidate={revalidate}
              onUnhide={onUnhide}
              isHiddenView
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function Command() {
  const {
    isLoading,
    data: ports,
    revalidate,
  } = useCachedPromise(getActivePorts, [], {
    keepPreviousData: true,
  });

  const {
    data: hiddenPorts,
    revalidate: revalidateHidden,
    isLoading: isLoadingHidden,
  } = usePromise(getHiddenPorts);

  const hidePort = useCallback(
    async (port: number) => {
      const current = await getHiddenPorts();
      if (!current.includes(port)) {
        await setHiddenPorts([...current, port]);
        await showToast({
          style: Toast.Style.Success,
          title: `Port ${port} hidden`,
        });
        revalidateHidden();
      }
    },
    [revalidateHidden],
  );

  const unhidePort = useCallback(
    async (port: number) => {
      const current = await getHiddenPorts();
      await setHiddenPorts(current.filter((p) => p !== port));
      await showToast({
        style: Toast.Style.Success,
        title: `Port ${port} unhidden`,
      });
      revalidateHidden();
    },
    [revalidateHidden],
  );

  const allPorts = ports || [];
  const visiblePorts = allPorts.filter((p) => !hiddenPorts?.includes(p.port));
  const hiddenCount = allPorts.filter((p) =>
    hiddenPorts?.includes(p.port),
  ).length;

  const devPorts = visiblePorts.filter((p) => p.isDevServer);
  const systemPorts = visiblePorts.filter((p) => !p.isDevServer);

  return (
    <List
      isLoading={isLoading || isLoadingHidden}
      searchBarPlaceholder="Filter by port, name, or path..."
    >
      {visiblePorts.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Active Ports"
          description="No listening ports found"
          icon={Icon.Network}
        />
      )}
      {devPorts.length > 0 && (
        <List.Section
          title="Development Servers"
          subtitle={`${devPorts.length}`}
        >
          {devPorts.map((info) => (
            <PortListItem
              key={`${info.port}-${info.pid}`}
              info={info}
              revalidate={revalidate}
              onHide={hidePort}
            />
          ))}
        </List.Section>
      )}
      {systemPorts.length > 0 && (
        <List.Section title="System & Apps" subtitle={`${systemPorts.length}`}>
          {systemPorts.map((info) => (
            <PortListItem
              key={`${info.port}-${info.pid}`}
              info={info}
              revalidate={revalidate}
              onHide={hidePort}
            />
          ))}
        </List.Section>
      )}
      {hiddenCount > 0 && (
        <List.Section>
          <List.Item
            icon={{ source: Icon.EyeDisabled, tintColor: Color.SecondaryText }}
            title={`${hiddenCount} service${hiddenCount > 1 ? "s" : ""} hidden`}
            accessories={[{ icon: Icon.ChevronRight }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Hidden Services"
                  icon={Icon.Eye}
                  target={
                    <HiddenServicesView
                      allPorts={allPorts}
                      hiddenPorts={hiddenPorts || []}
                      onUnhide={unhidePort}
                      revalidate={revalidate}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
