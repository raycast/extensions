export interface TerminalOpenOptions {
  ghosttyOpenBehavior?: "window" | "tab";
}

export interface TerminalAdapter {
  name: string;
  bundleId: string;
  open(directory: string, options?: TerminalOpenOptions): Promise<void>;
}
