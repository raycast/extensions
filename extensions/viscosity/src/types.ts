// Real Viscosity statuses: Connecting, Authenticating, Connected, Disconnecting, Disconnected
export enum ConnectionState {
  Changing = "Changing",
  Connected = "Connected",
  Disconnected = "Disconnected",
}

export type Connection = {
  name: string
  state: ConnectionState
  isQuickConnect?: boolean
}
