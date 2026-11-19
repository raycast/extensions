import { LaunchType, Toast, environment, showHUD, showToast, updateCommandMetadata } from "@raycast/api";
import { getTokenError } from "./api/monobank";
import { fetchClientInfo } from "./services/clientInfo";
import { SyncResult, TimeRange, syncNext } from "./services/statement";
import { formatDate, formatDateRange, getItemTitle } from "./utils";

/**
 * Accounts rarely change, and "Show Accounts" and "Show Statement" refresh the cache whenever they're opened,
 * so a run every 2 minutes doesn't need to request them.
 */
const CLIENT_INFO_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * Runs every 2 minutes in the background, with one statement request per run. First it syncs the last 31 days of
 * each account or jar that wasn't synced today (by this command, "Show Statement" or the AI), so all of them are
 * synced once a day. Then it loads their older history, 31 days per run, back to "Keep Statements For" (a year for
 * Unlimited), so past periods open without waiting. Once all of it is loaded, runs make no requests.
 */
export default async function Command() {
  const isUserInitiated = environment.launchType === LaunchType.UserInitiated;

  try {
    if (isUserInitiated) {
      await showToast({ style: Toast.Style.Animated, title: "Syncing statements…" });
    }

    const { items, defaultItem } = await fetchClientInfo({ maxAge: CLIENT_INFO_MAX_AGE });
    // The account "Show Statement" opens by default first, as it's the one opened most.
    const ordered = defaultItem ? [defaultItem, ...items.filter((item) => item.id !== defaultItem.id)] : items;

    const result = await syncNext(ordered);
    await updateCommandMetadata({ subtitle: getSubtitle(result) });

    if (result.synced) console.log(getLogMessage(result));
    if (isUserInitiated) await showHUD(getHudMessage(result));
  } catch (error) {
    // In the background, only log: a missing token or being offline shouldn't flag the command every 2 minutes.
    console.error(error);
    if (isUserInitiated) await showHUD(getErrorMessage(error));
  }
}

/** E.g. "Synced today: 3 of 5 · History: 2 of 5", without the history once all of it is loaded. */
function getSubtitle({ syncedToday, historyDone, total }: SyncResult) {
  if (!total) return null;
  const today = `Synced today: ${syncedToday} of ${total}`;
  return historyDone < total ? `${today} · History: ${historyDone} of ${total}` : today;
}

/** E.g. "17 Oct – 10 Nov 2026". */
function formatRange(range: TimeRange) {
  return formatDateRange(range.from, range.to);
}

/**
 * What was loaded, and why the next run continues where it does, e.g.
 * "Loaded history of *0001: 25 Sept – 17 Oct 2026, 500 transactions. Asked for 16 Sept – 17 Oct 2026, but the
 * response stopped at 500 transactions, so older ones (before 25 Sept) load next. More history to load. (…)"
 */
function getLogMessage({ kind, synced, syncedToday, historyDone, total }: SyncResult) {
  if (!synced) return "";
  const { item, requested, loaded, count, isCut, historyLeft } = synced;
  const name = getItemTitle(item);
  const title = kind === "today" ? `Synced the last 31 days of ${name}` : `Loaded history of ${name}`;
  const cut = isCut
    ? ` Asked for ${formatRange(requested)}, but the response stopped at ${count} transactions, so older ones ` +
      `(before ${formatDate(new Date(loaded.from * 1000))}) load ${kind === "today" ? "with history" : "next"}.`
    : "";
  const account = kind === "history" ? (historyLeft ? " More history to load." : " Its history is complete.") : "";
  const progress = ` (synced today: ${syncedToday} of ${total}, history: ${historyDone} of ${total})`;

  return `${title}: ${formatRange(loaded)}, ${count} transactions.${cut}${account}${progress}`;
}

/** E.g. "Synced *0001: 17 Oct – 10 Nov · 2 left" or "Loaded history of *0001: 25 Sept – 17 Oct · more to load". */
function getHudMessage({ kind, synced, syncedToday, total }: SyncResult) {
  if (!synced) return total ? "All statements are up to date" : "No accounts to sync";
  const { item, loaded, historyLeft } = synced;
  const name = getItemTitle(item);

  if (kind === "today") {
    const left = total - syncedToday;
    return `Synced ${name}: ${formatRange(loaded)}${left ? ` · ${left} left` : ""}`;
  }
  return `Loaded history of ${name}: ${formatRange(loaded)} · ${historyLeft ? "more to load" : "history complete"}`;
}

function getErrorMessage(error: unknown) {
  switch (getTokenError(error)) {
    case "missing":
      return "Set your monobank access token in the extension preferences";
    case "invalid":
      return "monobank rejected the access token. Check it in the extension preferences";
    default:
      return `Couldn't sync statements: ${error instanceof Error ? error.message : String(error)}`;
  }
}
