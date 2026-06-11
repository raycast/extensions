import { useEffect, useRef, useState } from "react";
import { spawn } from "node:child_process";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  Toast,
  getSelectedFinderItems,
  showHUD,
  showToast,
} from "@raycast/api";
import { bar, isFile, plan, transfer } from "./uploader";
import { Config, DEFAULT_DIR, loadConfig, saveConfig } from "./config";

type Phase = "loading" | "setup" | "select" | "uploading" | "done" | "error";

function testConnection(host: string): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn("/usr/bin/ssh", [
      "-o",
      "BatchMode=yes",
      "-o",
      "ConnectTimeout=8",
      host,
      "echo ok",
    ]);
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", (e) => resolve(`error: ${e.message}`));
    child.on("close", (code) =>
      resolve(
        code === 0 && out.includes("ok")
          ? "ok"
          : (err || out).trim() || `exited ${code}`,
      ),
    );
  });
}

export default function Command() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [config, setConfig] = useState<Config>({
    host: "",
    remoteDir: DEFAULT_DIR,
  });
  const [setupHost, setSetupHost] = useState("");
  const [setupDir, setSetupDir] = useState(DEFAULT_DIR);
  const [files, setFiles] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [statusLine, setStatusLine] = useState("");
  const [remotePaths, setRemotePaths] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const started = useRef(false);

  useEffect(() => {
    (async () => {
      const c = await loadConfig();
      setConfig(c);
      setSetupHost(c.host);
      setSetupDir(c.remoteDir);
      if (!c.host) {
        setPhase("setup");
        return;
      }
      setPhase("select");
      try {
        const items = await getSelectedFinderItems();
        const picked = items.map((i) => i.path).filter(isFile);
        if (picked.length) setFiles(picked);
      } catch {
        // No Finder selection — fine.
      }
    })();
  }, []);

  async function runTest(host: string) {
    const h = host.trim();
    if (!h) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter an SSH host first",
      });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Testing ${h}…`,
    });
    const res = await testConnection(h);
    if (res === "ok") {
      toast.style = Toast.Style.Success;
      toast.title = `Connected to ${h}`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Connection failed";
      toast.message = res;
    }
  }

  async function saveSetup() {
    const host = setupHost.trim();
    if (!host) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter an SSH host",
      });
      return;
    }
    const c: Config = { host, remoteDir: (setupDir || DEFAULT_DIR).trim() };
    await saveConfig(c);
    setConfig(c);
    await showToast({
      style: Toast.Style.Success,
      title: "Saved",
      message: `${c.host}:${c.remoteDir}`,
    });
    setPhase("select");
  }

  function openConfigure() {
    setSetupHost(config.host);
    setSetupDir(config.remoteDir);
    setPhase("setup");
  }

  async function upload(selected: string[]) {
    if (started.current) return;
    const { valid, targets } = plan(selected, config.remoteDir);
    if (valid.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
      });
      return;
    }
    started.current = true;

    // Copy the remote path(s) to the clipboard right away.
    await Clipboard.copy(targets.join(" "));
    setRemotePaths(targets);
    setProgress(0);
    setPhase("uploading");

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Uploading to ${config.host}`,
      message: bar(0),
    });

    try {
      await transfer(valid, targets, config.host, config.remoteDir, {
        onProgress: (pct) => {
          setProgress(pct);
          toast.message = bar(pct);
        },
        onStatus: setStatusLine,
      });
      setProgress(100);
      toast.style = Toast.Style.Success;
      toast.title =
        valid.length > 1 ? `Uploaded ${valid.length} files` : "Uploaded";
      toast.message = "Remote path copied to clipboard";
      setPhase("done");
      await showHUD("☁ Uploaded, remote path copied");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.style = Toast.Style.Failure;
      toast.title = "Upload failed";
      toast.message = msg;
      setErrorMsg(msg);
      setPhase("error");
    }
  }

  if (phase === "loading") {
    return <Detail isLoading markdown="" />;
  }

  if (phase === "setup") {
    const firstRun = !config.host;
    return (
      <Form
        navigationTitle="Set up VPS Upload"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save"
              icon={Icon.Check}
              onSubmit={saveSetup}
            />
            <Action
              title="Test Connection"
              icon={Icon.Bolt}
              onAction={() => runTest(setupHost)}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          text={
            firstRun
              ? "☁️ Welcome! Tell VPS Upload where to send files. Settings are stored locally on this Mac, with no Raycast Settings trip needed."
              : "Update where VPS Upload sends files."
          }
        />
        <Form.TextField
          id="sshHost"
          title="SSH Host"
          placeholder="vps or user@host"
          value={setupHost}
          onChange={setSetupHost}
          info="An ~/.ssh/config alias (e.g. vps) or user@host. Must allow key-based, non-interactive login (ssh -o BatchMode=yes <host> true)."
        />
        <Form.TextField
          id="remoteDir"
          title="Remote Directory"
          placeholder={DEFAULT_DIR}
          value={setupDir}
          onChange={setSetupDir}
          info="Absolute path on the server where files are placed. Created if missing."
        />
      </Form>
    );
  }

  if (phase === "select") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Upload to Server"
              icon={Icon.Upload}
              onSubmit={(values: { files: string[] }) =>
                upload(values.files ?? files)
              }
            />
            <Action
              title="Test Connection"
              icon={Icon.Bolt}
              onAction={() => runTest(config.host)}
            />
            <Action
              title="Configure Server"
              icon={Icon.Gear}
              onAction={openConfigure}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          text={`Files upload to ${config.host}:${config.remoteDir} and the remote path is copied to your clipboard. Tip: select files in Finder and run "Upload Finder Selection" for a one-keystroke upload.`}
        />
        <Form.FilePicker
          id="files"
          title="Files"
          allowMultipleSelection
          value={files}
          onChange={setFiles}
        />
      </Form>
    );
  }

  const joined = remotePaths.join(" ");
  let markdown: string;
  if (phase === "uploading") {
    markdown = `# Uploading to \`${config.host}\`\n\n\`\`\`\n${bar(progress)}\n\`\`\`\n\n${statusLine}\n\n_Remote path (already on clipboard):_\n\n\`${joined}\``;
  } else if (phase === "done") {
    markdown = `# ✅ Upload complete\n\n\`\`\`\n${bar(100)}\n\`\`\`\n\nRemote path copied to clipboard:\n\n\`${joined}\``;
  } else {
    markdown = `# ❌ Upload failed\n\n\`\`\`\n${errorMsg}\n\`\`\`\n\nPartial remote path: \`${joined}\``;
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        phase !== "uploading" ? (
          <ActionPanel>
            {phase === "done" && (
              <Action.CopyToClipboard
                title="Copy Remote Path Again"
                content={joined}
              />
            )}
            <Action
              title="Configure Server"
              icon={Icon.Gear}
              onAction={openConfigure}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
