export type { SearchState, VM };
export { VMState, VMAction, IconsColorType };

interface VM {
  id: string;
  name: string;
  description: string;
  os: string;
  state: VMState;
}

enum VMState {
  Stopped,
  Resuming,
  Running,
  Suspended,
  Unknown,
}

enum IconsColorType {
  Color,
  Mono,
}

enum VMAction {
  Start,
  Suspend,
  Resume,
  Stop,
  Restart,
  Reset,
  Pause,
  Shutdown,
}

interface SearchState {
  vms: VM[];
  isLoading: boolean;
}
