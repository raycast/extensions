import { showToast, Toast } from "@raycast/api";
import { flushDns, type WriteResult } from "./hosts-file";
import { saveStore, type HostsStore } from "./storage";
import { syncHostsToDisk } from "./sync";
import { strings } from "./strings";

interface CommitOptions {
  /**
   * Store state to put back when the file cannot be rewritten, so the list
   * never claims a state the hosts file does not have.
   */
  previous: HostsStore;
  next: HostsStore;
  /** When true, /etc/hosts is rewritten as part of the commit. */
  sync: boolean;
  successTitle: string;
  /** Public section to write instead of the one already in the file. */
  commonContent?: string;
  /** Keep the custom section the file already has instead of the store's. */
  keepFileProfile?: boolean;
}

/**
 * Persists `next` and optionally rewrites /etc/hosts, keeping both in step.
 *
 * The store is written first: it is the cheap step, while the hosts write is
 * the one that can fail in front of the user (a cancelled authorization, an
 * unreadable file). When that write fails, the store is restored, so a failed
 * commit leaves both sides as they were. Returns whether the update succeeded.
 */
export async function commitStore(options: CommitOptions): Promise<boolean> {
  const { next, previous } = options;
  try {
    await saveStore(next);

    let result: WriteResult | null = null;
    try {
      result = options.sync
        ? await syncHostsToDisk(next, {
            commonContent: options.commonContent,
            keepFileProfile: options.keepFileProfile,
          })
        : null;
    } catch (error) {
      await restoreStore(previous);
      throw error;
    }

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

/** Best-effort rollback; a restore failure must not hide the original error. */
async function restoreStore(previous: HostsStore): Promise<void> {
  try {
    await saveStore(previous);
  } catch {
    // The write error that triggered the rollback is what the user needs to see.
  }
}
