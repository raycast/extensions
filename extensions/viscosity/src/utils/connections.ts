import { Connection, ConnectionState } from "@/types"

export const compare = (a: Connection, b: Connection) => {
  if (a.isQuickConnect && !b.isQuickConnect) return -1
  if (!a.isQuickConnect && b.isQuickConnect) return 1

  const priority = {
    [ConnectionState.Connected]: 0,
    [ConnectionState.Changing]: 0,
    [ConnectionState.Disconnected]: 1,
  }

  const stateA = priority[a.state] ?? 1
  const stateB = priority[b.state] ?? 1

  if (stateA !== stateB) {
    return stateA - stateB
  }

  return a.name.localeCompare(b.name)
}

export const sort = (connections: Connection[], quickConnectName: string): Connection[] => {
  return connections
    .map((c) => ({
      ...c,
      isQuickConnect: c.name === quickConnectName,
    }))
    .sort(compare)
}
