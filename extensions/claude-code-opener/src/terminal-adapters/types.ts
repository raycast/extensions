export interface TerminalAdapter {
  name: string;
  bundleId: string;
  open(directory: string, claudeBinary: string): Promise<void>;
}
