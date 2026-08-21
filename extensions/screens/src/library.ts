import { useLocalStorage } from '@raycast/utils';
import { ClientProtocol, Connection, ConnectionType } from './archive';
import { ConnectTarget, normalizeHostname, resolveTarget } from './connect';

const STORAGE_KEY = 'connections';

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
    name: '',
    type: 'local',
    clientProtocol: 'vnc',
    target: { kind: 'saved', identifier: '', ambiguous: false },
  };
}
