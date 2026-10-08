import { execSync } from "child_process";

class YASB {
  static COMMAND_PREFIX = "yasbc";

  static VERSION_COMMAND = `${YASB.COMMAND_PREFIX} --version`;

  static START_COMMAND = `${YASB.COMMAND_PREFIX} start`;
  static STOP_COMMAND = `${YASB.COMMAND_PREFIX} stop`;
  static RELOAD_COMMAND = `${YASB.COMMAND_PREFIX} reload`;
  static ENABLE_AUTO_START_COMMAND = `${YASB.COMMAND_PREFIX} enable-autostart`;
  static DISABLE_AUTO_START_COMMAND = `${YASB.COMMAND_PREFIX} disable-autostart`;
  static MONITOR_INFO_COMMAND = `${YASB.COMMAND_PREFIX} monitor-information`;
  static SHOW_BAR_COMMAND = `${YASB.COMMAND_PREFIX} show-bar`;
  static HIDE_BAR_COMMAND = `${YASB.COMMAND_PREFIX} hide-bar`;
  static TOGGLE_BAR_COMMAND = `${YASB.COMMAND_PREFIX} toggle-bar`;
  static TOGGLE_WIDGET_COMMAND = `${YASB.COMMAND_PREFIX} toggle-widget`;
  static UPDATE_COMMAND = `${YASB.COMMAND_PREFIX} update`;

  static executeCommand(command: string, args?: string[]): string {
    if (args && args.length > 0) {
      command += " " + args.join(" ");
    }
    try {
      return execSync(command).toString().trim();
    } catch (error) {
      console.error(`Error executing command: ${command}`, error);
      throw new Error(`Failed to execute command: ${command}`);
    }
  }
}

export { YASB };
