import { ASEvalItermProfiles } from "./types";
import { DEFAULT_ITERM_PROFILE } from "./constants";

type FallbackWindowTargetType = "newWindow" | "newTab";
type WindowTargetType = FallbackWindowTargetType | "currentWindow";

type GlobalScriptOptionsType = {
  escapeString: typeof escapeString;
  addIndent: typeof addIndent;
  withProfile: typeof withProfile;
  indentSymbol: string;
  windowVar: string;
  profile?: ASEvalItermProfiles;
};

const INDENT_SYMBOL = "    ";
const WINDOW_VAR = "commandWindow";

const addIndent = (code: string, level: number = 1, tabSymbol: string = INDENT_SYMBOL) =>
  code
    .split("\n")
    .map((line) => `${tabSymbol.repeat(level)}${line}`)
    .join("\n");

const escapeString = (str: string) => str.replace(/"/g, '\\"');

const withProfile = (profile?: ASEvalItermProfiles) => {
  switch (profile) {
    case undefined:
    case DEFAULT_ITERM_PROFILE:
      return "default profile";
    default:
      return `profile "${profile}"`;
  }
};

/* Init Window scripts */
const createNewWindow = ({ windowVar, profile }: GlobalScriptOptionsType) => {
  return /* applescript */ `
set ${windowVar} to create window with ${withProfile(profile)}
activate
`; /* end applescript */
};

const createNewTab = ({ windowVar, profile }: GlobalScriptOptionsType) => {
  return /* applescript */ `
if windows of application "iTerm" is {} then
    set ${windowVar} to create window with ${withProfile(profile)}
else
    tell application "iTerm" to tell the first window to create tab with ${withProfile(profile)}
    set ${windowVar} to current window
end if

activate
` /* end applescript */;
};

const currentWIndow = ({ windowVar }: GlobalScriptOptionsType) => {
  return /* applescript */ `
if windows of application "iTerm" is not {} then
    set ${windowVar} to current window
end if
    ` /* end applescript */;
};

const initTargetWindow = (globalOptions: GlobalScriptOptionsType, target: WindowTargetType) => {
  switch (target) {
    case "newWindow":
      return createNewWindow(globalOptions);
      break;
    case "newTab":
      return createNewTab(globalOptions);
      break;
    case "currentWindow":
      return currentWIndow(globalOptions);
      break;
    default:
      throw new Error("Invalid window target: " + target);
  }
};

const initFallbackTargetWindow = (globalOptions: GlobalScriptOptionsType, fallbackTarget: WindowTargetType) => {
  return /* applescript */ `
if ${globalOptions.windowVar} is null then
    ${initTargetWindow(globalOptions, fallbackTarget)}
end if
`; /* end applescript */
};

/* exec bash script commands */
const execShellTasks = ({ windowVar }: GlobalScriptOptionsType, shellCommands?: string[]) => {
  const cmds = shellCommands?.filter((cmd) => !!cmd) || null;
  if (!cmds) return "";

  return cmds
    .map(
      (cmd) => /* applescript */ `
tell current session of ${windowVar}
    write text "${escapeString(cmd)}"
end tell
` /* end applescript */,
    )
    .join("");
};

export const ASWindowOperations = (
  options: {
    target?: WindowTargetType;
    fallbackTarget?: FallbackWindowTargetType;
    profile?: ASEvalItermProfiles;
    shellCommands?: string[];
    asCommands?: (params: GlobalScriptOptionsType) => string;
  } = {},
) => {
  const { shellCommands, asCommands, fallbackTarget } = options;
  const target = options.target || "newWindow";
  const profile = options.profile;

  const globalOptions: GlobalScriptOptionsType = {
    escapeString,
    addIndent,
    withProfile: (_p = profile) => withProfile(_p),
    indentSymbol: INDENT_SYMBOL,
    windowVar: WINDOW_VAR,
    profile,
  };

  return /* applescript */ `
tell application "iTerm"
    set ${WINDOW_VAR} to null

    launch
    repeat until application "iTerm" is running
        delay 0.1
    end repeat

    ${addIndent(initTargetWindow(globalOptions, target))}
    ${fallbackTarget ? addIndent(initFallbackTargetWindow(globalOptions, fallbackTarget)) : ""}

    if ${WINDOW_VAR} is null then
        return "There is no active window."
    end if

    ${asCommands ? addIndent(asCommands(globalOptions)) : ""}
    ${addIndent(execShellTasks(globalOptions, shellCommands))}
end tell
return
    ` /* end applescript */;
};
