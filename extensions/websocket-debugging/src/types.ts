interface Preferences {
  PusherAppID: string;
  PusherAppKey: string;
  PusherAppSecret: string;
  PusherAppCluster: string;
  PusherAppEncrypted: boolean;
}

type State = {
  isLoading: boolean;
  searchText: string;
  logs: Log[];
  visibleLogs: Log[];
  selectedItemId: string;
  channel: string;
};

type Log = {
  id: string;
  channel: string;
  event: string;
  message: any;
  time: string;
}


export type { Preferences, State, Log };
