import { exec, execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import { afterEach, beforeEach, vi } from "vitest";
import { setAppleScriptRunner } from "./fake-raycast";

// A simulated Mac for the integration tests. The app's real code runs unchanged; this class answers the OS commands
// it runs (pmset, sudo, osascript, sysctl, and the Touch ID and AppleScript prompts) from in-memory state, the way macOS would. It never touches the machine.

export const PMSET = "/usr/bin/pmset";
export const SUDO = "/usr/bin/sudo";
export const OSASCRIPT = "/usr/bin/osascript";
export const SYSCTL = "/usr/sbin/sysctl";
export const SUDOERS_PATH = "/etc/sudoers.d/raycast-doorstopper-alice";
export const PAM_SUDO_LOCAL = "/etc/pam.d/sudo_local";

export type FakeBattery = { present: boolean; percent: number; onAC: boolean };
export type LoggedCommand = { file: string; args: string[] };
export type SudoersMeta = { owner: string; mode: string };
type StagedFile = { content: string; owner?: string; mode?: string };

const DEFAULT_BATTERY: FakeBattery = { present: true, percent: 80, onAC: false };
const DEFAULT_BOOT_TIME = 1_728_633_600;

// The admin script that lib/system.ts builds. The fake reads the rule out of it and runs each step of the chain itself,
// so a change to what the app writes changes what the fake does.
const INSTALL_SCRIPT =
  /^T=\$\(\/usr\/bin\/mktemp (\/etc\/sudoers\.d\/\.raycast-doorstopper\.XXXXXX)\) \|\| exit 1; (.+); S=\$\?; \/bin\/rm -f "\$T"; exit \$S$/;
const INSTALL_PRINTF = /^\/usr\/bin\/printf '%s\\n' '([^']*)' > "\$T"$/;
const INSTALL_VISUDO = /^\/usr\/sbin\/visudo -cf "\$T"$/;
const INSTALL_CHOWN = /^\/usr\/sbin\/chown (\S+) "\$T"$/;
const INSTALL_CHMOD = /^\/bin\/chmod (\d+) "\$T"$/;
const INSTALL_MV = /^\/bin\/mv -f "\$T" (\/etc\/sudoers\.d\/raycast-doorstopper-[A-Za-z0-9_]+)$/;
const REMOVE_SCRIPT = /^\/bin\/rm -f (\/etc\/sudoers\.d\/raycast-doorstopper-[A-Za-z0-9_]+)$/;
const ADMIN_SCRIPT = /^do shell script "(.*)" with administrator privileges$/s;
const PMSET_DISABLESLEEP = /^\/usr\/bin\/pmset -a disablesleep ([01])$/;
const RULE_LINE = /^[A-Za-z0-9._-]+ ALL=\(root\) NOPASSWD: .+$/;

// The part of visudo the rule needs: one "user ALL=(root) NOPASSWD: command, command" rule per line, absolute commands.
export function sudoersSyntaxOk(content: string): boolean {
  if (!content.endsWith("\n")) {
    return false;
  }
  const lines = content.slice(0, -1).split("\n");
  return lines.every((line) => {
    if (!RULE_LINE.test(line)) {
      return false;
    }
    const commands = line.slice(line.indexOf("NOPASSWD: ") + "NOPASSWD: ".length).split(", ");
    return commands.every((command) => /^\/[^"'\n]+$/.test(command));
  });
}

export class FakeMac {
  username = "alice";
  sleepDisabled = false;
  battery: FakeBattery = { ...DEFAULT_BATTERY };
  bootTime = DEFAULT_BOOT_TIME;
  // Path to content, as in /etc/sudoers.d.
  sudoersFiles = new Map<string, string>();
  sudoersMeta = new Map<string, SudoersMeta>();
  adminPrompt: "approve" | "cancel" = "approve";
  // Whether Touch ID is enabled for sudo in /etc/pam.d/sudo_local, and what the user does at its prompt.
  touchIdForSudo = false;
  touchIdPrompt: "approve" | "cancel" = "approve";
  // How many of the next `pmset -g` reads fail, as a read does when the power settings cannot be read.
  failPmsetReads = 0;
  // Every command the app ran, in order.
  log: LoggedCommand[] = [];
  // Commands the fake does not know. Any entry fails the test, even if the app code caught the error.
  unexpected: string[] = [];
  private staging = new Map<string, StagedFile>();
  private tempCount = 0;

  reset(): void {
    this.username = "alice";
    this.sleepDisabled = false;
    this.battery = { ...DEFAULT_BATTERY };
    this.bootTime = DEFAULT_BOOT_TIME;
    this.sudoersFiles = new Map();
    this.sudoersMeta = new Map();
    this.adminPrompt = "approve";
    this.touchIdForSudo = false;
    this.touchIdPrompt = "approve";
    this.failPmsetReads = 0;
    this.log = [];
    this.unexpected = [];
    this.staging = new Map();
    this.tempCount = 0;
  }

  clearLog(): void {
    this.log = [];
  }

  // Temporary files an install left in sudoers.d. A finished install leaves none.
  get stagingFiles(): string[] {
    return [...this.staging.keys()];
  }

  // True when sudo would let this user run exactly this command without a password.
  userMayRun(file: string, args: string[]): boolean {
    return this.sudoersCommands().includes([file, ...args].join(" "));
  }

  // Answers one command the way macOS would. Returns stdout, or throws an error the way execFile does.
  run(file: string, args: string[]): string {
    this.log.push({ file, args: [...args] });
    if (file === PMSET) {
      return this.pmset(args);
    }
    if (file === SYSCTL) {
      return this.sysctl(args);
    }
    if (file === SUDO) {
      return this.sudo(args);
    }
    if (file === OSASCRIPT) {
      return this.osascript(args);
    }
    return this.unknown(`${file} ${args.join(" ")}`);
  }

  // The file contents macOS would have, for the PAM files sudoSupport.ts reads. Returns undefined when it does not exist.
  readFile(path: string): string | undefined {
    if (path === PAM_SUDO_LOCAL && this.touchIdForSudo) {
      return "# sudo_local: local config file which survives system update\nauth       sufficient     pam_tid.so\n";
    }
    return undefined;
  }

  // Answers a shell command run through exec. sudoSupport.ts runs only "/usr/bin/sudo <command>", which asks for Touch ID.
  runShell(command: string): string {
    this.log.push({ file: "sh", args: [command] });
    const prefix = `${SUDO} `;
    if (!command.startsWith(prefix) || !this.touchIdForSudo) {
      return this.unknown(`sh -c ${command}`);
    }
    if (this.touchIdPrompt === "cancel") {
      // sudo falls back to a password prompt, which needs a terminal that Raycast does not have.
      throw Object.assign(new Error(`Command failed: ${command}`), {
        stderr:
          "sudo: a terminal is required to read the password; either use the -S option to read from standard input or configure an askpass helper\n",
      });
    }
    this.runRootCommand(command.slice(prefix.length));
    return "";
  }

  // Answers runAppleScript from @raycast/utils. sudoSupport.ts passes the shell command as the script's only argument.
  runAppleScript(script: string, args: string[]): string {
    this.log.push({ file: "runAppleScript", args: [...args] });
    if (!script.includes("do shell script item 1 of argv") || !script.includes("with administrator privileges")) {
      return this.unknown(`runAppleScript ${script}`);
    }
    if (this.adminPrompt === "cancel") {
      throw new Error("execution error: User canceled. (-128)");
    }
    this.runAsRootShell(args[0]);
    return "";
  }

  private unknown(command: string): never {
    const message = `FakeMac cannot run: ${command}`;
    this.unexpected.push(message);
    throw new Error(message);
  }

  private pmset(args: string[]): string {
    const line = args.join(" ");
    if (line === "-g") {
      if (this.failPmsetReads > 0) {
        this.failPmsetReads -= 1;
        throw new Error("pmset: could not read power settings");
      }
      return this.generalReport();
    }
    if (line === "-g batt") {
      return this.batteryReport();
    }
    // A user who is not root cannot change power settings. Only sudo or the admin prompt can.
    if (args[0] === "-a" && args[1] === "disablesleep") {
      throw new Error("pmset: must be run as root");
    }
    return this.unknown(`${PMSET} ${line}`);
  }

  private sysctl(args: string[]): string {
    if (args.join(" ") !== "-n kern.boottime") {
      return this.unknown(`${SYSCTL} ${args.join(" ")}`);
    }
    return `{ sec = ${this.bootTime}, usec = 0 } Sat Oct 11 08:00:00 2026\n`;
  }

  private sudo(args: string[]): string {
    let rest = args;
    let list = false;
    let nonInteractive = false;
    while (rest.length > 0 && rest[0].startsWith("-")) {
      if (rest[0] === "-l") {
        list = true;
      } else if (rest[0] === "-n") {
        nonInteractive = true;
      } else if (rest[0] !== "-k") {
        return this.unknown(`${SUDO} ${args.join(" ")}`);
      }
      rest = rest.slice(1);
    }
    if (!nonInteractive) {
      return this.unknown(`${SUDO} without -n: ${args.join(" ")}`);
    }
    if (!this.userMayRun(rest[0], rest.slice(1))) {
      throw new Error("sudo: a password is required");
    }
    if (list) {
      return `User ${this.username} may run the following commands:\n    (root) NOPASSWD: ${rest.join(" ")}\n`;
    }
    this.runRootCommand(rest.join(" "));
    return "";
  }

  private osascript(args: string[]): string {
    const match = args.length === 2 && args[0] === "-e" ? ADMIN_SCRIPT.exec(args[1]) : null;
    if (!match) {
      return this.unknown(`${OSASCRIPT} ${args.join(" ")}`);
    }
    if (this.adminPrompt === "cancel") {
      throw new Error("execution error: User canceled. (-128)");
    }
    // Undo the AppleScript string escapes: \" becomes ", and \\ becomes \.
    const shell = match[1].replace(/\\(["\\])/g, "$1");
    this.runAsRootShell(shell);
    return "";
  }

  // Runs a shell command as root. Only the shapes Doorstopper writes are known.
  private runAsRootShell(shell: string): void {
    const remove = REMOVE_SCRIPT.exec(shell);
    if (remove) {
      this.sudoersFiles.delete(remove[1]);
      this.sudoersMeta.delete(remove[1]);
      return;
    }
    const install = INSTALL_SCRIPT.exec(shell);
    if (install) {
      this.runInstall(install[1], install[2]);
      return;
    }
    this.runRootCommand(shell);
  }

  private runRootCommand(command: string): void {
    const pmset = PMSET_DISABLESLEEP.exec(command);
    if (pmset) {
      this.sleepDisabled = pmset[1] === "1";
      return;
    }
    this.unknown(`as root: ${command}`);
  }

  // Runs the install chain: write the rule to a temporary file, check it, set owner and mode, then move it into place.
  // A failed step stops the chain, so the installed file is left as it was.
  private runInstall(template: string, chain: string): void {
    const temp = template.replace("XXXXXX", String(++this.tempCount).padStart(6, "0"));
    const staged: StagedFile = { content: "" };
    this.staging.set(temp, staged);
    let status = 0;
    for (const step of chain.split(" && ")) {
      status = this.installStep(step, staged);
      if (status !== 0) {
        break;
      }
    }
    // The script's final "rm -f $T" runs whether or not the chain succeeded.
    this.staging.delete(temp);
    if (status !== 0) {
      throw new Error(`execution error: install script exited with status ${status}`);
    }
  }

  private installStep(step: string, staged: StagedFile): number {
    const printf = INSTALL_PRINTF.exec(step);
    if (printf) {
      staged.content = `${printf[1]}\n`;
      return 0;
    }
    if (INSTALL_VISUDO.test(step)) {
      return sudoersSyntaxOk(staged.content) ? 0 : 1;
    }
    const chown = INSTALL_CHOWN.exec(step);
    if (chown) {
      staged.owner = chown[1];
      return 0;
    }
    const chmod = INSTALL_CHMOD.exec(step);
    if (chmod) {
      staged.mode = chmod[1];
      return 0;
    }
    const mv = INSTALL_MV.exec(step);
    if (mv) {
      this.sudoersFiles.set(mv[1], staged.content);
      this.sudoersMeta.set(mv[1], { owner: staged.owner ?? "", mode: staged.mode ?? "" });
      return 0;
    }
    return this.unknown(`install step: ${step}`);
  }

  // The commands the sudoers files grant this user with NOPASSWD. sudo ignores dotted file names in sudoers.d.
  private sudoersCommands(): string[] {
    const commands: string[] = [];
    for (const [path, content] of this.sudoersFiles) {
      const name = path.slice(path.lastIndexOf("/") + 1);
      if (name.startsWith(".")) {
        continue;
      }
      for (const line of content.split("\n")) {
        const match = /^(\S+) ALL=\(root\) NOPASSWD: (.+)$/.exec(line);
        if (match && match[1] === this.username) {
          commands.push(...match[2].split(", "));
        }
      }
    }
    return commands;
  }

  private generalReport(): string {
    return [
      "System-wide power settings:",
      ` SleepDisabled\t\t${this.sleepDisabled ? 1 : 0}`,
      "Currently in use:",
      " standby              1",
      " powernap             1",
      " lowpowermode         0",
      " lidwake              1",
      "",
    ].join("\n");
  }

  private batteryReport(): string {
    const { present, percent, onAC } = this.battery;
    const lines = [`Now drawing from '${onAC ? "AC Power" : "Battery Power"}'`];
    if (present) {
      const state = onAC ? "charging" : "discharging";
      lines.push(` -InternalBattery-0 (id=1234567)\t${percent}%; ${state}; 4:00 remaining present: true`);
    }
    return `${lines.join("\n")}\n`;
  }
}

// Points the app's os.userInfo(), execFile, exec, PAM file reads and runAppleScript at the fake Mac. Test files mock
// "node:os", "node:child_process" and "node:fs" with plain vi.fn()s, so these are the only implementations the app can reach.
export function installFakeMac(mac: FakeMac): void {
  vi.mocked(existsSync).mockImplementation((path) => mac.readFile(String(path)) !== undefined);
  vi.mocked(readFileSync).mockImplementation(((path: string) => {
    const content = mac.readFile(String(path));
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return content;
  }) as typeof readFileSync);
  vi.mocked(exec).mockImplementation(((command: string, ...rest: unknown[]) => {
    const callback = rest[rest.length - 1] as (
      error: Error | null,
      result?: { stdout: string; stderr: string },
    ) => void;
    let stdout: string;
    try {
      stdout = mac.runShell(command);
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    callback(null, { stdout, stderr: "" });
  }) as unknown as typeof exec);
  setAppleScriptRunner(async (script, args) => mac.runAppleScript(script, args));
  vi.mocked(os.userInfo).mockImplementation(() => ({
    uid: 501,
    gid: 20,
    username: mac.username,
    homedir: `/Users/${mac.username}`,
    shell: "/bin/zsh",
  }));
  vi.mocked(execFile).mockImplementation(((file: string, args: string[], ...rest: unknown[]) => {
    const callback = rest[rest.length - 1] as (
      error: Error | null,
      result?: { stdout: string; stderr: string },
    ) => void;
    let stdout: string;
    try {
      stdout = mac.run(file, args);
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    callback(null, { stdout, stderr: "" });
  }) as unknown as typeof execFile);
}

// Creates the fake Mac for a test file and resets it before each test. Call it at the top of the file.
export function useFakeMac(): FakeMac {
  const mac = new FakeMac();
  beforeEach(() => {
    mac.reset();
    installFakeMac(mac);
  });
  afterEach(() => {
    if (mac.unexpected.length > 0) {
      throw new Error(`The app ran commands the fake Mac does not handle:\n${mac.unexpected.join("\n")}`);
    }
  });
  return mac;
}
