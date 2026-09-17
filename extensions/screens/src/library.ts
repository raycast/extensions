import { useLocalStorage } from "@raycast/utils";
import { ClientProtocol, Connection, ConnectionType } from "./archive";
import { ConnectTarget, normalizeHostname, resolveTarget } from "./connect";

const STORAGE_KEY = "connections";
const REVIEWED_KEY = "reviewed-connections";

/**
 * A connection in Raycast's own list. Importing an archive is a shortcut for filling this in, so it
 * holds nothing an archive alone could supply: counts and dates from Screens would be frozen at the
 * moment of import and wrong from then on.
 */
export interface SavedConnection {
  id: string;
  name: string;
  type: ConnectionType;
  clientProtocol: ClientProtocol;
  target: ConnectTarget;
}

export function useSavedConnections() {
  const { value, setValue, isLoading } = useLocalStorage<SavedConnection[]>(STORAGE_KEY, []);
  return { connections: value ?? [], setConnections: setValue, isLoading };
}

/**
 * Every connection an import has already offered, whether or not it was kept. An archive the user
 * declined in full leaves nothing behind in the saved list, which reads the same as an archive
 * never imported, so without this the next import would offer those connections over again.
 */
export function useReviewedConnections() {
  const { value, setValue, isLoading } = useLocalStorage<string[]>(REVIEWED_KEY, []);
  return { reviewed: new Set(value ?? []), setReviewed: setValue, isLoading };
}

/**
 * Freezes a connection from the archive into a saved one. `all` is the whole archive so the connect
 * target accounts for entries the user did not import.
 */
export function toSavedConnection(connection: Connection, all: Connection[]): SavedConnection {
  return {
    id: connection.id,
    name: connection.name || normalizeHostname(connection.hostname),
    type: connection.type,
    clientProtocol: connection.clientProtocol,
    target: resolveTarget(connection, all),
  };
}

export function blankConnection(): SavedConnection {
  return {
    id: crypto.randomUUID(),
    name: "",
    type: "local",
    clientProtocol: "vnc",
    target: { kind: "saved", identifier: "", ambiguous: false },
  };
}
