import {
  ActionPanel,
  List,
  Detail,
  Action,
  closeMainWindow,
  showToast,
  Toast,
  Alert,
  confirmAlert,
  PopToRootType,
  Icon,
  environment,
} from "@raycast/api";
import { connect, Socket } from "net";
import { useState, useEffect, useRef } from "react";
import { appendFileSync, copyFileSync, chmodSync, mkdirSync, lstatSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const LOG_FILE = "/tmp/dmenu_ts_debug.log";

// Unique per-module-load id: if this changes across "mounts" logged close together,
// it tells us whether the whole module/command is being invoked twice, vs. just the effect.
const INSTANCE_ID = Math.random().toString(36).slice(2, 8);

type Props = {
  arguments: Arguments.Dmenu;
};

const CLI_INSTALL_DIR = join(homedir(), ".local", "bin");
const CLI_INSTALL_PATH = join(CLI_INSTALL_DIR, "dmenu");
const CLI_ASSET_PATH = join(environment.assetsPath, "dmenu.py");
const CLI_RECV_TIMEOUT = 30;

const PATH_EXPORT = `export PATH="$HOME/.local/bin:$PATH"`;

const USAGE_EXAMPLE = `echo -e "Option A\\nOption B\\nOption C" | dmenu -p "Pick one"`;

async function installCli() {
  try {
    mkdirSync(CLI_INSTALL_DIR, { recursive: true });

    // Never replace an existing executable or symlink without explicit confirmation.
    // In particular, users may already have the X11 dmenu or another script at this path.
    let targetExists = false;

    try {
      lstatSync(CLI_INSTALL_PATH);
      targetExists = true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }

    if (targetExists) {
      const shouldReplace = await confirmAlert({
        title: "Replace Existing dmenu CLI?",
        message: `${CLI_INSTALL_PATH} already exists. Replacing it may overwrite your existing dmenu or script.`,
        primaryAction: {
          title: "Replace",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!shouldReplace) return;
    }

    copyFileSync(CLI_ASSET_PATH, CLI_INSTALL_PATH);
    chmodSync(CLI_INSTALL_PATH, 0o755);

    await showToast({
      style: Toast.Style.Success,
      title: "Installed dmenu CLI",
      message: `Copied to ${CLI_INSTALL_PATH}.`,
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't install CLI",
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

const t0 = Date.now();

// Debug logging only ever runs during `ray develop`, never in a Store/production
// install — and even then it never records the piped options or the selected
// value, just event names/counts, so it can't become a plaintext record of
// what the user searched for or picked.
function log(msg: string) {
  if (!environment.isDevelopment) return;

  const line = `[TS ${((Date.now() - t0) / 1000).toFixed(3)}] [inst:${INSTANCE_ID}] ${msg}`;

  console.log(line);

  try {
    appendFileSync(LOG_FILE, line + "\n");
  } catch (e) {
    // best-effort; if this fails there's nothing else we can do to surface it
  }
}

log(`module evaluated (pid=${process.pid})`);

export default function Command({ arguments: { socket: socketPath, prompt } }: Props) {
  log(`Command() function body invoked (render), socketPath=${socketPath}`);

  const [elements, setElements] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const socket = useRef<Socket | null>(null);

  // Flips to true the moment we send a choice back over the socket. Used to
  // tell a normal post-selection close apart from the CLI's RECV_TIMEOUT
  // giving up on us — only the latter should switch to the "timed out" screen.
  const selectionSent = useRef(false);

  // dmenu is only meant to be launched via the 'dmenu' CLI script, which opens
  // this command with a Unix socket path baked into the deeplink. Launching it
  // directly from Raycast (root search, hotkey, etc.) omits that argument
  // entirely, which used to crash with an uncaught error from net.connect().
  // Guard for that here so we can show a friendly explanation instead.
  const argsValid = Boolean(socketPath);

  useEffect(() => {
    if (!argsValid) {
      log(`invalid/missing arguments (socketPath=${socketPath}); skipping socket connect`);
      return;
    }

    let alive = true;
    let buf = "";

    log(`Connecting to Unix socket at ${socketPath}`);

    const s = connect({ path: socketPath });
    socket.current = s;

    s.on("connect", () => log(`Socket connected`));

    s.on("data", (chunk) => {
      log(`data event: ${chunk.length} bytes`);
      buf += chunk.toString("utf8");

      const idx = buf.indexOf("\n");

      if (idx === -1) {
        log("no newline yet in buffer, waiting for more data");
        return;
      }

      const count = parseInt(buf.slice(0, idx));

      if (isNaN(count)) {
        log(`could not parse count from buffer head (${idx} bytes)`);
        return;
      }

      const body = buf.slice(idx + 1);
      const lines = body.split("\n");

      if (lines.length < count + 1) {
        log(`waiting for remaining chunks: have ${lines.length} lines, need ${count + 1}`);
        return;
      }

      const items = lines.slice(0, count).filter(Boolean);

      log(`parsed ${items.length} elements`);

      setElements(items);
      setIsLoaded(true);

      buf = "";
    });

    s.on("end", () => {
      log("Socket 'end' event (remote sent FIN)");
    });

    s.on("error", (err) => {
      log(`Socket error: ${err.message}`);

      if (err.message.includes("ECONNRESET")) return;

      showToast({
        style: Toast.Style.Failure,
        title: "Socket Error",
        message: err.message,
      });
    });

    s.on("close", (hadError) => {
      log(`Socket closed (hadError=${hadError})`);

      // If we're unmounting anyway (cleanup already ran, e.g. the user
      // dismissed the list), there's nothing useful to show. If a selection
      // was already sent, this is just the normal post-selection teardown.
      // A hadError close is already surfaced by the "error" handler above.
      //
      // What's left — a clean close, with no selection sent, while we're
      // still mounted — means dmenu.py's RECV_TIMEOUT elapsed and it gave up
      // waiting. Show a brief timeout state before closing Raycast.
      if (!alive || selectionSent.current || hadError) return;

      log("Socket closed with no selection sent — dmenu gave up waiting");
      setTimedOut(true);
    });

    return () => {
      if (!alive) return;

      alive = false;

      if (socket.current) {
        log("cleanup: ending socket");
        socket.current.end();
        socket.current = null;
      }

      log("Socket connection ended (cleanup ran)");
    };
  }, []);

  // The timeout screen is intentionally transient. Give the user enough time
  // to see what happened, then return them to whatever they were doing.
  useEffect(() => {
    if (!timedOut) return;

    const timeout = setTimeout(() => {
      closeMainWindow({ popToRootType: PopToRootType.Immediate });
    }, 5000);

    return () => clearTimeout(timeout);
  }, [timedOut]);

  const handleSelection = (item: string) => {
    log(`handleSelection called (item length=${item.length})`);

    const s = socket.current;

    if (!s) {
      log("socket.current is null, cannot send selection");

      showToast({
        style: Toast.Style.Failure,
        title: "Socket disconnected",
      });

      closeMainWindow({ popToRootType: PopToRootType.Immediate });
      return;
    }

    log(`socket state before write: destroyed=${s.destroyed}, writable=${s.writable}, readyState=${s.readyState}`);

    selectionSent.current = true;

    const writeOk = s.write(item + "\n", (err) => {
      if (err) {
        log(`write() callback received error: ${err.message}`);
      } else {
        log("write() callback: flush complete, calling end()");
      }

      s.end(); // guaranteed to flush before close
    });

    log(`write() returned (buffered ok=${writeOk})`);

    // Force the nav stack back to root regardless of the user's "Pop to Root
    // Search" preference — otherwise closeMainWindow() may just hide this
    // same (now-stale) list, and reopening Raycast shows it again with a
    // dead socket behind it.
    closeMainWindow({ popToRootType: PopToRootType.Immediate });

    log("Item selected and sent to backend");
  };

  if (!argsValid) {
    const markdown = [
      "# Set up dmenu",
      "",
      "Install the dmenu CLI once, then pipe a list of options into it from your terminal.",
      "",
      "## Get started",
      "",
      `The CLI will be installed to \`~/.local/bin/dmenu\`.`,
      "",
      "After installing, make sure `~/.local/bin` is on your shell's PATH.",
      "",
      "## Try it",
      "",
      "```sh",
      USAGE_EXAMPLE,
      "```",
    ].join("\n");

    return (
      <Detail
        navigationTitle="Set up dmenu"
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Install Dmenu Cli" icon={Icon.Download} onAction={installCli} />

            <Action.CopyToClipboard title="Copy Path Command" icon={Icon.CopyClipboard} content={PATH_EXPORT} />

            <Action.CopyToClipboard
              title="Copy Usage Example"
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              content={USAGE_EXAMPLE}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (timedOut) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Clock}
          title="dmenu timed out"
          description={`No selection was made within ${CLI_RECV_TIMEOUT} seconds.`}
        />
      </List>
    );
  }

  return (
    <List isLoading={!isLoaded} searchBarPlaceholder={prompt || "Choose an option"}>
      {elements.map((item, idx) => (
        <List.Item
          title={item}
          key={idx}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => handleSelection(item)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
