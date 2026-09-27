import { showToast, Toast } from "@raycast/api";
import { flushDns } from "./hosts-file";
import { saveStore, type HostsStore } from "./storage";
import { syncHostsToDisk } from "./sync";
import { strings } from "./strings";

interface CommitOptions {
  /** When true, /etc/hosts is rewritten before the store is persisted. */
  sync: boolean;
  successTitle: string;
  /** Public section to write instead of the one already in the file. */
  commonContent?: string;
  /** Keep the custom section the file already has instead of the store's. */
  keepFileProfile?: boolean;
}

/**
 * Persists `next` and optionally rewrites /etc/hosts first. When the system
 * write fails nothing is persisted. Returns whether the update succeeded.
 */
export async function commitStore(
  next: HostsStore,
  options: CommitOptions,
): Promise<boolean> {
  try {
    const result = options.sync
      ? await syncHostsToDisk(next, {
          commonContent: options.commonContent,
          keepFileProfile: options.keepFileProfile,
        })
      : null;
    await saveStore(next);

    if (result && !result.elevated && !(await flushDns())) {
      await showToast({
        style: Toast.Style.Failure,
        title: options.successTitle,
        message: strings.dnsRefreshFailed,
      });
      return true;
    }

    await showToast({
      style: Toast.Style.Success,
      title: options.successTitle,
    });
    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: strings.failedPrefix(options.successTitle),
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
