import { runAppleScript } from "@raycast/utils"
import { Connection, ConnectionState } from "@/types"
import { escape, poll } from "@/utils"

async function run(script: string): Promise<string> {
  return await runAppleScript(`tell application "Viscosity"\n${script}\nend tell`)
}

export async function getConnectionNames(): Promise<Connection[]> {
  const script = `
      set AppleScript's text item delimiters to "\\n"
      set connectionCount to count of connections
      set resultList to {}

      repeat with i from 1 to connectionCount
        set connectionName to name of connection i
        set connectionState to state of connection i
        set end of resultList to connectionName & "||" & connectionState
      end repeat

      return resultList as string
    `
  const response = await run(script)
  if (!response) return []

  return response.split("\n").map((cn) => {
    const [name, state] = cn.trim().split("||")
    return { name, state: state as ConnectionState }
  })
}

export async function getActiveConnections(): Promise<Connection[]> {
  const connections = await getConnectionNames()
  return connections.filter((c) => c.state === ConnectionState.Connected)
}

export async function getConnectionState(name: string): Promise<ConnectionState | null> {
  const script = `
      set connectionCount to count of connections
      set connectionState to ""

      repeat with i from 1 to connectionCount
        set connectionName to name of connection i
        if connectionName is "${escape(name)}" then
          set connectionState to state of connection i
          exit repeat
        end if
      end repeat

      return connectionState
    `
  const state = await run(script)
  return (state as ConnectionState) || null
}

export async function connect(name: string): Promise<void> {
  await run(`connect "${escape(name)}"`)
}

export async function disconnect(name: string): Promise<void> {
  await run(`disconnect "${escape(name)}"`)
}

export async function disconnectAll(): Promise<void> {
  await run("disconnectall")
}

export async function waitForConnectionState(
  name: string,
  targetState: ConnectionState,
): Promise<ConnectionState | null> {
  return poll(
    () => getConnectionState(name),
    (state) => state === targetState,
  )
}

export async function waitForAllDisconnected(): Promise<boolean> {
  const result = await poll(
    () => getConnectionNames(),
    (connections) => connections.every((c) => c.state === ConnectionState.Disconnected),
  )
  return !!result
}
