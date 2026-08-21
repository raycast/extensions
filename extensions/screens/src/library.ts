import { useLocalStorage } from '@raycast/utils';
import { ClientProtocol, Screen, ScreenType } from './archive';
import { ConnectTarget, resolveTarget } from './connect';

const STORAGE_KEY = 'imported-screens';

/**
 * A screen the user chose to keep. Everything needed to connect is captured here, so the archive
 * it came from is only needed to import again.
 */
export interface ImportedScreen {
  id: string;
  name: string;
  hostname: string;
  type: ScreenType;
  clientProtocol: ClientProtocol;
  target: ConnectTarget;
  /** ISO 8601, because LocalStorage round-trips through JSON and would hand back a string anyway. */
  lastConnectionDate?: string;
  numberOfConnections: number;
}

export function useImportedScreens() {
  const { value, setValue, isLoading } = useLocalStorage<ImportedScreen[]>(STORAGE_KEY, []);
  return { screens: value ?? [], setScreens: setValue, isLoading };
}

/**
 * Freezes a screen from the archive into a stored entry. `all` is the whole archive so the
 * connect target accounts for entries the user did not import.
 */
export function toImportedScreen(screen: Screen, all: Screen[]): ImportedScreen {
  return {
    id: screen.id,
    name: screen.name,
    hostname: screen.hostname,
    type: screen.type,
    clientProtocol: screen.clientProtocol,
    target: resolveTarget(screen, all),
    lastConnectionDate: screen.lastConnectionDate?.toISOString(),
    numberOfConnections: screen.numberOfConnections,
  };
}

export function importedScreenTitle(screen: ImportedScreen): string {
  return screen.name || screen.hostname;
}
