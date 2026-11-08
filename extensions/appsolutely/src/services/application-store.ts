import type { DiscoveredApplication, LauncherApplication } from "../models/application.ts";
import { prepareApplications } from "./application-model.ts";
import { toError } from "./state-repository.ts";

interface ApplicationSnapshot {
  applications: LauncherApplication[];
  isLoading: boolean;
  revision: number;
  error?: Error;
}

interface ApplicationSource {
  discover(): Promise<DiscoveredApplication[]>;
}

export function createApplicationStore(source: ApplicationSource) {
  let snapshot: ApplicationSnapshot = { applications: [], isLoading: true, revision: 0 };
  let pending: Promise<void> | undefined;
  const listeners = new Set<() => void>();

  function publish(next: ApplicationSnapshot) {
    snapshot = next;
    for (const listener of listeners) listener();
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refresh: (): Promise<void> => {
      if (pending) return pending;
      publish({ ...snapshot, isLoading: true, error: undefined });
      pending = (async () => {
        try {
          const applications = prepareApplications(await source.discover());
          publish({ applications, isLoading: false, revision: snapshot.revision + 1 });
        } catch (error) {
          publish({ ...snapshot, isLoading: false, error: toError(error) });
        } finally {
          pending = undefined;
        }
      })();
      return pending;
    },
  };
}
