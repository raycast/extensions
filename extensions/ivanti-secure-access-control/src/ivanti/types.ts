export type IvantiConnectionSource = string;

export type IvantiConnectionStatus = "connected" | "connecting" | "disconnecting" | "disconnected" | "unknown";

export interface IvantiConnection {
  id: string;
  index: number;
  name: string;
  type: string;
  source: IvantiConnectionSource;
  uri: string;
  buttonTitle?: string;
  status: IvantiConnectionStatus;
}

export interface IvantiConnectionOverview {
  appInstalled: boolean;
  appPath: string;
  connectionStoreFound: boolean;
  connectionStorePath: string;
  connections: IvantiConnection[];
  statusError?: string;
  statusSupported: boolean;
}

export interface IvantiConnectionState {
  buttonTitle: string;
  name: string;
  status: string;
  uri: string;
}
