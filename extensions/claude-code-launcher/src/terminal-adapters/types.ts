export interface TerminalOpenOptions {
  ghosttyOpenBehavior?: "window" | "tab";
  /** Arguments appended to the `claude` invocation, e.g. ["attach", "b0da874e"]. Omit to launch plain `claude`. */
  claudeArgs?: string[];
}

export interface TerminalAdapter {
  name: string;
  bundleId: string;
  open(directory: string, options?: TerminalOpenOptions): Promise<void>;
}
