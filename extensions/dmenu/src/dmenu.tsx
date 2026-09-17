import {
  ActionPanel,
  List,
  Action,
  closeMainWindow,
  showToast,
  Toast,
  PopToRootType,
  Icon,
  environment,
} from "@raycast/api";
import { connect, Socket } from "net";
import { useState, useEffect, useRef } from "react";
import { appendFileSync, copyFileSync, chmodSync, mkdirSync } from "fs";
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

async function installCli() {
  try {
    mkdirSync(CLI_INSTALL_DIR, { recursive: true });
    copyFileSync(CLI_ASSET_PATH, CLI_INSTALL_PATH);
    chmodSync(CLI_INSTALL_PATH, 0o755);
    await showToast({
      style: Toast.Style.Success,
      title: "Installed dmenu CLI",
      message: `Copied to ${CLI_INSTALL_PATH}. Make sure ~/.local/bin is on your PATH.`,
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

  const socket = useRef<Socket | null>(null);

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
  }, []); // only once

  const handleSelection = (item: string) => {
    log(`handleSelection called (item length=${item.length})`);
    const s = socket.current;

    if (!s) {
      log("socket.current is null, cannot send selection");
      showToast({ style: Toast.Style.Failure, title: "Socket disconnected" });
      closeMainWindow({ popToRootType: PopToRootType.Immediate });
      return;
    }

    log(`socket state before write: destroyed=${s.destroyed}, writable=${s.writable}, readyState=${s.readyState}`);

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
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="dmenu isn't meant to be launched directly"
          description={`Run it by piping a list of options into the dmenu command-line script.\n\nFirst time here? Use "Install Dmenu CLI" below to set it up — it copies the script bundled with this extension to ${CLI_INSTALL_PATH}.`}
          actions={
            <ActionPanel>
              <Action title="Install Dmenu Cli" icon={Icon.Terminal} onAction={installCli} />
              <Action.CopyToClipboard title="Copy Path Export Line" content={`export PATH="$HOME/.local/bin:$PATH"`} />
            </ActionPanel>
          }
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
