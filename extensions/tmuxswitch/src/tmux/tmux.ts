import { execSync } from "child_process";

type ItemWindow = Record<string, string>;

export class Tmux {
  private readonly path: string;
  private readonly socket_path: string;
  private readonly session: string;
  private window_format = "'#{window_name};#{window_id}'";

  constructor(path: string, session: string, socket_path: string) {
    this.path = path;
    if (this.path.length == 0) {
      this.path = "tmux";
    }

    this.session = session;
    this.socket_path = socket_path;
  }

  list_window(all: boolean): ItemWindow {
    const command = [
      this.path,
      "-S",
      this.socket_path,
      "list-windows",
      "-F",
      this.window_format,
    ];
    if (all) {
      command.push("-a");
    }

    const items: ItemWindow = {};
    const output = execSync(command.join(" "));
    const stdout = output.toString();
    const lines = stdout.split("\n");
    for (const line of lines) {
      const parts = line.split(";");
      if (parts.length != 2) {
        continue;
      }
      items[parts[1]] = parts[0];
    }
    return items;
  }

  switch_client(target_window: string) {
    const cmd = [
      this.path,
      "-S",
      this.socket_path,
      "switch-client",
      "-t",
      target_window,
    ];
    execSync(cmd.join(" "));
  }

  current_session(): string {
    return this.session;
  }

  static switch_to_iterm2(session_name: string) {
    const script = `'tell application "iTerm2"
            activate
            tell current window
                repeat with aTab in tabs
                    set profileName to profile name of current session of aTab
                        if profileName is "${session_name}" then
                            select aTab
                            exit repeat
                        end if
                end repeat
            end tell

        end tell'
        `;
    const cmd = ["osascript", "-e", script];
    execSync(cmd.join(" "));
  }
}
