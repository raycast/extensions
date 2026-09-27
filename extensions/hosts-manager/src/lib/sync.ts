import { parseManagedBlock, renderManagedBlock } from "./managed-block";
import { readHostsFile, writeHostsFile, type WriteResult } from "./hosts-file";
import { activeProfileOf, type HostsStore } from "./storage";

export interface SyncOptions {
  /** Public section to write instead of the one already in the file. */
  commonContent?: string;
  /**
   * Keep the custom section the file already has instead of writing the store's
   * applied profile. Used when only the public configuration changed.
   */
  keepFileProfile?: boolean;
}

/**
 * Rewrites /etc/hosts to match the given store.
 *
 * The public section is taken from the file itself, so entries there — the
 * system's own ones and anything edited by hand — survive untouched; only the
 * applied profile section is replaced. Pass `commonContent` to overwrite the
 * public section, which is what the public configuration form does.
 */
export async function syncHostsToDisk(
  store: HostsStore,
  options: SyncOptions = {},
): Promise<WriteResult> {
  const current = parseManagedBlock(await readHostsFile());
  const applied = activeProfileOf(store);
  const profile = options.keepFileProfile
    ? current.profile
    : applied
      ? { name: applied.name, content: applied.content }
      : null;

  return writeHostsFile(
    renderManagedBlock({
      commonContent: options.commonContent ?? current.commonContent,
      profile,
    }),
  );
}
