import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  DEFAULT_WATCHLIST,
  MAX_WATCHLIST_SIZE,
  getPrimaryAssetId,
  getWatchlist,
  refreshMenuBar,
  refreshQuotes,
  setPrimaryAssetId,
  setWatchlist,
} from "./market";
import { parseWatchlistInput } from "./market-ids";

type FormValues = {
  watchlist: string;
};

export default function Command() {
  const { data: storedIds, isLoading } = useCachedPromise(getWatchlist);
  const [draft, setDraft] = useState<string>();
  const watchlist = draft ?? storedIds?.join("\n") ?? "";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Watchlist"
            icon={Icon.CheckCircle}
            onSubmit={save}
          />
          <Action
            title="Reset to Defaults"
            icon={Icon.RotateClockwise}
            onAction={() => setDraft(DEFAULT_WATCHLIST.join("\n"))}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="watchlist"
        title="Watchlist"
        value={watchlist}
        onChange={setDraft}
        placeholder="stock:SPY&#10;crypto:bitcoin&#10;token:base:0x...&#10;polymarket:540817:yes"
      />
      <Form.Description text="Use one asset per line. Supported prefixes: stock, crypto, token, polymarket, binance, and binanceperp." />
    </Form>
  );
}

async function save(values: FormValues) {
  const { ids, invalid } = parseWatchlistInput(values.watchlist);
  if (invalid.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid asset ID",
      message: invalid.slice(0, 3).join(", "),
    });
    return;
  }
  if (!ids.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Watchlist is empty",
      message: "Add at least one stock, crypto, token, or Polymarket asset.",
    });
    return;
  }
  if (ids.length > MAX_WATCHLIST_SIZE) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Watchlist is too large",
      message: `Use ${MAX_WATCHLIST_SIZE} items or fewer.`,
    });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Saving Ticker Bar",
  });
  const currentPrimary = await getPrimaryAssetId();
  await setWatchlist(ids);
  if (!currentPrimary || !ids.includes(currentPrimary)) {
    await setPrimaryAssetId(ids[0]);
  }
  const report = await refreshQuotes(ids, { force: true });
  await refreshMenuBar({ renderOnly: true });
  await showToast(
    report.failures.length
      ? {
          style: Toast.Style.Failure,
          title: "Saved with unavailable quotes",
          message: `${report.updatedIds.length} updated · ${report.failures.length} failed`,
        }
      : {
          style: Toast.Style.Success,
          title: "Ticker Bar saved",
          message: `${ids.length} asset${ids.length === 1 ? "" : "s"}`,
        },
  );
  await popToRoot();
}
