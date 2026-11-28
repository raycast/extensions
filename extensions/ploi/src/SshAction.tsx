import { Action, Icon, closeMainWindow, getApplications, getPreferenceValues, open } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { IServer } from "./Server";

// The command is typed into the user's shell, so only allow plain user and host names
const SSH_DESTINATION = /^[\w.-]+@[\w.:-]+$/;

type ScriptedTerminal = { name: string; bundleId: string; requirement: string; script: string };

// Type the command into a fresh shell instead of running it directly, so the user's shell config
// (e.g. SSH agent) is loaded and connection errors stay visible. This mirrors what Ghostty, iTerm2
// and Terminal do themselves when opening a .command file.
const SCRIPTED_TERMINALS: Partial<Record<Preferences["ploi_ssh_terminal"], ScriptedTerminal>> = {
  ghostty: {
    name: "Ghostty",
    bundleId: "com.mitchellh.ghostty",
    requirement: "Ghostty 1.3 or newer",
    script: `
      on run argv
        tell application "Ghostty"
          set config to new surface configuration
          set initial input of config to (item 1 of argv) & linefeed
          new window with configuration config
          activate
        end tell
      end run
    `,
  },
  iterm: {
    name: "iTerm2",
    bundleId: "com.googlecode.iterm2",
    requirement: "iTerm2",
    script: `
      on run argv
        tell application "iTerm"
          set newWindow to (create window with default profile)
          tell current session of newWindow to write text (item 1 of argv)
          activate
        end tell
      end run
    `,
  },
};

const sshPort = (server: IServer) =>
  Number.isInteger(server.sshPort) && server.sshPort > 0 ? server.sshPort : undefined;

const sshDestination = (user: string, server: IServer) => {
  const destination = `${user}@${server.ipAddress}`;
  if (!SSH_DESTINATION.test(destination)) throw new Error(`Invalid SSH destination "${destination}"`);
  return destination;
};

export const sshCommand = (user: string, server: IServer) => {
  const port = sshPort(server);
  return `ssh${port ? ` -p ${port}` : ""} ${sshDestination(user, server)}`;
};

const sshUrl = (user: string, server: IServer) => {
  const port = sshPort(server);
  return `ssh://${sshDestination(user, server)}${port ? `:${port}` : ""}`;
};

const openInScriptedTerminal = async (terminal: ScriptedTerminal, command: string) => {
  const apps = await getApplications();
  if (!apps.some((app) => app.bundleId === terminal.bundleId)) throw new Error(`${terminal.name} is not installed`);

  try {
    // The first run shows a macOS permission dialog, so give the user time to answer it
    await runAppleScript(terminal.script, [command], { timeout: 60_000 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    if (/-1743|Not authorized/.test(message)) {
      throw new Error(
        `Allow Raycast to control ${terminal.name} under System Settings › Privacy & Security › Automation`,
      );
    }
    if (/timed out/i.test(message)) {
      throw new Error(`${terminal.name} did not respond. If a permission dialog appeared, allow it and try again`);
    }
    throw new Error(`${terminal.name} could not run the command. Make sure ${terminal.requirement} is installed`);
  }
};

const openSshConnection = async (user: string, server: IServer) => {
  const { ploi_ssh_terminal: terminal } = getPreferenceValues<Preferences>();

  try {
    const scriptedTerminal = SCRIPTED_TERMINALS[terminal];
    if (scriptedTerminal) {
      await openInScriptedTerminal(scriptedTerminal, sshCommand(user, server));
    } else {
      await open(sshUrl(user, server), terminal === "terminal" ? "com.apple.Terminal" : undefined);
    }
    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Could not open SSH connection" });
  }
};

// Shown next to the SSH list items; never throws so a bad hostname can't break rendering
export const sshCommandLabel = (user: string, server: IServer) => {
  try {
    return sshCommand(user, server);
  } catch {
    return `${user}@${server.ipAddress}`;
  }
};

export const OpenSshAction = ({ title, user, server }: { title: string; user: string; server: IServer }) => (
  <Action icon={Icon.Terminal} title={title} onAction={() => openSshConnection(user, server)} />
);
