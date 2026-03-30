export interface TerminalAdapter {
  name: string;
  bundleId: string;
  open(command: string): Promise<void>;
}
