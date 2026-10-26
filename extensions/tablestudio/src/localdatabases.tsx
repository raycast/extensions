import { Action, Icon, List } from "@raycast/api";
import { useRef, useState } from "react";
import { CatalogItem } from "./catalog";
import { CatalogErrorView, CatalogRow, isSettled, openLink, statusColor, useCatalog } from "./shared";

/** How long to keep watching after a start or stop before assuming it isn't coming. */
const POLL_INTERVAL_MS = 1500;
const POLL_ATTEMPTS = 12;

/**
 * Start and stop TableStudio's local database servers without opening the app.
 *
 * Separate from the search command on purpose: acting on a server is a different job from
 * navigating to one, and folding these rows into search would make one command a subset of the
 * other — the thing that made the old two-command layout confusing.
 *
 * This works in Raycast where it didn't in Spotlight. Spotlight would have needed App Intents to
 * put buttons on a result row and wouldn't present them reliably; here Start/Stop are ordinary
 * ActionPanel actions.
 */
export default function Command() {
  const { items, error, isStale, isLoading, reload } = useCatalog();
  const [isBusy, setIsBusy] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  if (!isLoading && error) {
    return <CatalogErrorView error={error} onRetry={reload} />;
  }

  const databases = items.filter((item) => item.category === "localDatabase");

  /**
   * Fire the action, then watch the catalog until the server settles, so the status tag visibly
   * goes Stopped → Starting → Running without leaving Raycast. The endpoint really does track
   * this: `SearchExportService` observes `LocalInstanceStore.$statuses` and republishes on an
   * 800ms debounce. A HUD-and-close would throw that feedback away.
   */
  async function perform(item: CatalogItem, link: string, verb: string) {
    clearTimeout(pollTimer.current);
    setIsBusy(true);
    await openLink(link, `${verb} ${item.title}…`);

    let attempts = 0;
    const poll = async () => {
      const result = await reload();
      const current = result.items.find((candidate) => candidate.id === item.id);
      // Stop once it settles, once the row disappears, or once we've waited long enough — a
      // server that fails to come up must not leave the list spinning forever.
      if (isSettled(current?.statusKind) || ++attempts >= POLL_ATTEMPTS) {
        setIsBusy(false);
        return;
      }
      pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
    };
    pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
  }

  return (
    <List isLoading={isLoading || isBusy} searchBarPlaceholder="Search local databases…">
      <List.EmptyView
        icon={Icon.Desktop}
        title={isStale ? "TableStudio isn't running" : "No local databases"}
        description={
          isStale
            ? "This is an offline copy. Open TableStudio to start or stop a server."
            : "Create one in TableStudio under Local Databases, or turn them on in Settings → Search & Launchers."
        }
      />
      {databases.map((item) => (
        <CatalogRow
          key={item.id}
          item={item}
          isStale={isStale}
          onRefresh={reload}
          // Claiming "Running" off a cached copy would be a claim we can't stand behind.
          accessories={
            item.status && !isStale
              ? [
                  {
                    tag: {
                      value: item.status,
                      color: statusColor(item.statusKind),
                    },
                  },
                ]
              : undefined
          }
          // The app sends exactly the one action that applies — Start when stopped, Stop when
          // running, nothing mid-transition so we can't race an operation already in flight.
          // Don't second-guess that here. It leads, so `↵` is the thing you came for.
          extraActions={
            isStale
              ? undefined
              : (item.actions ?? []).map((action) => (
                  <Action
                    key={action.id}
                    title={`${action.title} ${item.title}`}
                    icon={action.title === "Stop" ? Icon.Stop : Icon.Play}
                    onAction={() => perform(item, action.id, action.title === "Stop" ? "Stopping" : "Starting")}
                  />
                ))
          }
        />
      ))}
    </List>
  );
}
