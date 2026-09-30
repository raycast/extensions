import { Connection, ConnectionState } from "@/types"

export const mockConnections: Connection[] = [
  {
    name: "MyVPN – Romania",
    state: ConnectionState.Connected,
    isQuickConnect: true,
  },
  {
    name: "MyVPN – Canada",
    state: ConnectionState.Connected,
  },
  {
    name: "MyVPN – Czech Republic",
    state: ConnectionState.Disconnected,
  },
  {
    name: "MyVPN – New Zealand",
    state: ConnectionState.Disconnected,
  },
  {
    name: "OtherVPN – Canada",
    state: ConnectionState.Disconnected,
  },
  {
    name: "OtherVPN – Czech Republic",
    state: ConnectionState.Disconnected,
  },
  {
    name: "OtherVPN – Ireland",
    state: ConnectionState.Disconnected,
  },
  {
    name: "OtherVPN – USA",
    state: ConnectionState.Disconnected,
  },
]

export async function getConnectionNames(): Promise<Connection[]> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return mockConnections
}

export async function getActiveConnections(): Promise<Connection[]> {
  const connections = await getConnectionNames()
  return connections.filter((c) => c.state === ConnectionState.Connected)
}
