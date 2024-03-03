export const GITHUB_EXTENSION_URL = "https://www.raycast.com/ron-myers/iterm";
export const GITHUB_NEW_ISSUE_URL = "https://github.com/raycast/extensions/issues/new";

export const GITHUB_NEW_ISSUE_PARAMS = {
  assignees: "",
  projects: "",
  labels: "extension,bug",
  template: "extension_bug_report.yml",
  "extension-url": GITHUB_EXTENSION_URL,
};

export const PRIVACY_AUTOMATION_PANE_TARGET =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation";

export const DEFAULT_EDITOR = "$EDITOR";

export const EMPTY_STACK_TRACE = "Empty Stack Trace";
export const UNKNOWN_ERROR = "Unknown Error";

export enum ScriptType {
  applescript = "applescript",
  python = "python",
}

export const DEFAULT_ITERM_PROFILE = Symbol("default");
