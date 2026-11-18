import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  Toast,
  environment,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { statfsSync } from "node:fs";
import { homedir } from "node:os";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { formatBytes, openMint, runMintSurface } from "./mint-cli";
import type { MintCLIVersion } from "./mint-cli";
import { hasCapability } from "./mint-parity";
import {
  NEW_WORDS,
  PLAN_CAPABILITY,
  PRICING_URL,
  feedModel,
  modelValue,
  purchaseURL,
  WORDS,
  planTiles,
  pricesFromFeed,
  readyNow,
  readyParts,
  statusLine,
  usableValue,
  valueFooter,
  heldForWeek,
  refusedForPlan,
  unlockRows,
} from "./mint-plan";
import type { PlanAccess, PlanAnswer, PlanGate, PlanTile } from "./mint-plan";
import { savedGroups } from "./mint-saved";
import { markdownImage, planWallSVG } from "./mint-visuals";
import { BUNDLED_MODEL, usableModel } from "./space-value-model";
import { useMintCLI } from "./use-mint-cli";

type SurfaceRequest = Parameters<typeof runMintSurface>[1];
/** The wall falls back on its own (Mint 1.2.0's side, the bundled prices): no error toast over it. */
const quiet = () => undefined;
type Checkout = { opened?: boolean; planActive?: boolean };

/**
 * Whether Mint refused a request for the free plan (`refusedForPlan`). Asked
 * after a run failed or left files as they were, so the wall replaces the
 * error only then; when Mint cannot be asked, the error stays.
 */
export async function planRefused(cli: string, gate: PlanGate = "week"): Promise<boolean> {
  try {
    return refusedForPlan(await runMintSurface<PlanAccess>(cli, { action: "access.check" }, 30_000), gate);
  } catch {
    return false;
  }
}

/** Whether the week held back a run Mint answered with files left as they were (`heldForWeek`). */
export async function planHeld(cli: string, keptBytes: number[]): Promise<boolean> {
  if (keptBytes.length === 0) return false;
  try {
    return heldForWeek(await runMintSurface<PlanAccess>(cli, { action: "access.check" }, 30_000), keptBytes);
  } catch {
    return false;
  }
}

export type PlanWallPush = {
  /** Mint answered and held part of it back for the week (`refusedBytes`: the selection, when known). */
  held: (refusedBytes?: number) => void;
  /** Mint refused the run: the wall when it was the plan's refusal, and true; false leaves the error to the caller. */
  refused: (refusedBytes?: number, gate?: PlanGate) => Promise<boolean>;
  /** Mint answered and left files as they were (`keptBytes`, each): the wall when the week held one, and true. */
  keptBack: (keptBytes: number[]) => Promise<boolean>;
};

/** Pushes the wall from a command's own navigation. */
export function usePlanWall(cli: string): PlanWallPush {
  const { push } = useNavigation();
  return {
    held: (refusedBytes) => push(<PlanWall cli={cli} refusedBytes={refusedBytes} />),
    refused: async (refusedBytes, gate) => {
      if (!(await planRefused(cli, gate))) return false;
      push(<PlanWall cli={cli} refusedBytes={refusedBytes} />);
      return true;
    },
    keptBack: async (keptBytes) => {
      if (!(await planHeld(cli, keptBytes))) return false;
      push(<PlanWall cli={cli} refusedBytes={keptBytes.reduce((sum, bytes) => sum + bytes, 0)} />);
      return true;
    },
  };
}

/** This Mac's disk, as the plan page reads it (`volumeTotalCapacity` of the home's volume); undefined when unreadable. */
function diskCapacityBytes(): number | undefined {
  try {
    const stats = statfsSync(homedir());
    const bytes = Number(stats.blocks) * Number(stats.bsize);
    return Number.isFinite(bytes) && bytes > 0 ? bytes : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The plan wall: what Mint has done here and what that is worth, what is
 * ready now, and the two plans: ↵ Buy One-Time, ⌘↵ Start Rent-to-Own, ⌘O Open
 * Mint. With Mint 1.2.1+ every figure is Mint's (`plan.value`) and a press
 * opens Mint's own checkout (`plan.checkout`). With Mint 1.2.0 the left side
 * comes from the shared value model (no "so far"), the right from Mint's saved
 * groups, and a press opens the website's checkout, labelled Raycast.
 */
export function PlanWall({
  cli,
  version,
  refusedBytes,
}: {
  cli: string;
  version?: MintCLIVersion;
  /** What the week just held back, when a run opened the wall; none when opened by choice. */
  refusedBytes?: number;
}) {
  // The caller's answer, else this Mint's own (what its mint-cli says it can do).
  const { resolution } = useMintCLI();
  const own = hasCapability(
    version ?? (resolution.status === "ready" ? resolution.version : undefined),
    PLAN_CAPABILITY,
  );
  const answer = usePromise(
    async (path: string, refused: number | undefined) =>
      runMintSurface<PlanAnswer>(
        path,
        {
          action: "plan.value",
          ...(refused && refused > 0 ? { refusedBytes: Math.round(refused) } : {}),
        } as SurfaceRequest,
        30_000,
      ),
    [cli, refusedBytes],
    { execute: own, onError: quiet },
  );
  // Mint 1.2.0, or a plan.value that failed: the week from access.check; the prices, the value
  // model and the checkouts from the website's feed, as the app's plan page reads them.
  const fallback = !own || Boolean(answer.error);
  const access = usePromise(
    async (path: string) => runMintSurface<PlanAccess>(path, { action: "access.check" }, 30_000),
    [cli],
    { execute: fallback, onError: quiet },
  );
  const feed = usePromise(
    async () => {
      const response = await fetch(PRICING_URL, { signal: AbortSignal.timeout(5_000) });
      return response.ok ? ((await response.json()) as unknown) : undefined;
    },
    [],
    { execute: fallback, onError: quiet },
  );
  const groups = useMemo(() => (fallback ? savedGroups() : undefined), [fallback]);

  const loading = fallback ? access.isLoading || feed.isLoading : answer.isLoading;
  const data = fallback ? undefined : answer.data;
  const saved = readyNow(undefined, groups);
  const value = fallback
    ? modelValue({
        model: usableModel(feedModel(feed.data)) ?? BUNDLED_MODEL,
        capacityBytes: diskCapacityBytes(),
        readyBytes: saved.bytes,
        refusedBytes,
      })
    : usableValue(data?.value);
  const prices = data?.prices ?? pricesFromFeed(feed.data);
  const tiles = planTiles(prices);
  const ready = readyNow(data, groups, value);
  const readyFigure = value?.counts?.find((count) => count.label === WORDS.readyNow)?.figure;

  let markdown = "";
  if (!loading) {
    const { svg, width, height } = planWallSVG({
      // Read once, as every picture in this extension is: Raycast offers no theme-aware image for
      // markdown and no appearance-change event, so a wall left open across an Auto appearance change
      // keeps its colours until it is opened again (View Mac Status's cards do the same).
      appearance: environment.appearance === "light" ? "light" : "dark",
      format: formatBytes,
      title: WORDS.title,
      // The week's line, in the page's words, whenever Mint says what is left (also when opened by choice).
      status: statusLine(data ?? access.data),
      value: value
        ? {
            title: WORDS.valueTitle,
            estimate: WORDS.estimate,
            worthText: value.worthText,
            line: WORDS.valueLine,
            chart: value.chart,
            gapLabel: value.gapLabel,
            withMint: WORDS.withMint,
            neverClean: WORDS.neverClean,
            today: WORDS.today,
            threeYears: WORDS.threeYears,
            sentence: WORDS.sentence,
            footer: valueFooter(value),
          }
        : undefined,
      ready: { bytes: ready.bytes, figure: readyFigure, label: WORDS.readyNow, parts: readyParts(ready) },
      plans: tiles,
      unlocks: unlockRows(),
    });
    markdown = markdownImage(svg, width, height, WORDS.title);
  }

  const buy = async (tile: PlanTile) => {
    const title = tile.mode === "one_time" ? WORDS.buyOneTime : WORDS.startRentToOwn;
    if (fallback) {
      // Mint 1.2.0 cannot open its own checkout: the website's, the order labelled Raycast.
      try {
        await open(purchaseURL(feed.data, tile.mode));
        await showToast({
          style: Toast.Style.Success,
          title: NEW_WORDS.checkoutOpened,
          message: NEW_WORDS.checkoutNextSignIn,
        });
      } catch (error) {
        await showFailureToast(error, { title: NEW_WORDS.checkoutFailed });
      }
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      const result = await runMintSurface<Checkout>(cli, { action: "plan.checkout", mode: tile.mode }, 60_000);
      if (result.planActive) {
        await toast.hide();
        return;
      }
      if (result.opened) {
        toast.style = Toast.Style.Success;
        toast.title = NEW_WORDS.checkoutOpened;
        toast.message = NEW_WORDS.checkoutNext;
        toast.primaryAction = { title: "Open Mint", onAction: openMint };
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = NEW_WORDS.checkoutFailed;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = NEW_WORDS.checkoutFailed;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {/* ↵ and ⌘↵ buy, in the page's order; ⌘O opens Mint, the extension's own Open shortcut. */}
          <ActionPanel.Section>
            {tiles.map((tile) => (
              <Action
                key={tile.mode}
                title={tile.mode === "one_time" ? WORDS.buyOneTime : WORDS.startRentToOwn}
                icon={tile.mode === "one_time" ? Icon.Cart : Icon.Calendar}
                onAction={() => buy(tile)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Open Mint"
              icon={Icon.AppWindow}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={openMint}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
