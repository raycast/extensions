export type { SearchState, VM };
export { VMState, VMAction };

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

enum VMAction {
  Start,
  Suspend,
  Resume,
  Stop,
}

interface SearchState {
  vms: VM[];
  isLoading: boolean;
}
