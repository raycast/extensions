export interface Emulator {
  name: string;
  id: string;
  state: EmulatorState;
}
export enum EmulatorState {
  Running = "Running",
  Shutdown = "Shutdown",
}
