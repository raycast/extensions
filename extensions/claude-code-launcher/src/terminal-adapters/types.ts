export interface TerminalAdapter {
  name: string;
  bundleId: string;
  open(directory: string): Promise<void>;
}
