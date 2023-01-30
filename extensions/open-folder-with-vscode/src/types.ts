export interface Preferences {
  /** 终端， 默认 zsh -l -c */
  terminal: string;
  /** vscode版本 */
  build: "code" | "code-insiders";
}

export interface OpenWithVScodeOptions extends Preferences {
  path: string;
}
