import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Image,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  environment,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { formatCompact, openMint, plural, runMintSurface } from "./mint-cli";

import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";
import { MemoryApp as App, MemoryScan, Pile, PileKey, everyPile, pilePicture, pilesOf } from "./mint-panes";
import { useStrike } from "./use-strike";

type MemoryRelease = {
  quitNames: string[];
  survivedNames: string[];
  freedBytes: number;
  handlingReviewBlockedNames: string[];
};

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  return <FreeMemory cli={resolution.path} />;
}

/**
 * The Memory page's piles on the left, the apps in the selected one on the
 * right. ↵ on Idle quits every idle app; In use and Ask first are chosen app
 * by app. Each app is struck as it quits. The last answer shows at once
 * while Mint looks again; nothing acts on it until the fresh one is in.
 */
function FreeMemory({ cli }: { cli: string }) {
  const [run, setRun] = useState<{ key: PileKey; ids: string[] } | undefined>();
  const [receipt, setReceipt] = useState<{ key: PileKey; bytes: number; text: string } | undefined>();
  const [spent, setSpent] = useState<string | undefined>();
  const strike = useStrike();
  const scan = useCachedPromise(
    async (path: string) => runMintSurface<MemoryScan>(path, { action: "memory.scan" }, 60_000),
    [cli],
    { keepPreviousData: true },
  );
  const busy = Boolean(run) || strike.active;
  // A release uses Mint's answer: until it looks again, nothing else acts on it.
  const fresh = !scan.isLoading && !busy && Boolean(scan.data) && spent !== scan.data?.sessionID;
  const piles = everyPile(pilesOf(scan.data));
  const used = scan.data?.usedBytes ?? 0;
  const appearance = environment.appearance === "light" ? "light" : "dark";

  const lookAgain = () => {
    strike.reset();
    setReceipt(undefined);
    scan.revalidate();
  };

  async function release(pile: Pile, apps: App[]) {
    if (!scan.data || apps.length === 0 || busy) return;
    const advanced = apps.some((app) => app.advanced);
    if (advanced) {
      const accepted = await confirmAlert({
        icon: Icon.MemoryChip,
        title: `Quit ${plural(apps.length, "app")}?`,
        message:
          "Each is asked to quit first. What keeps running is forced to quit, and unsaved work there may be lost.",
        primaryAction: { title: "Quit", style: Alert.ActionStyle.Destructive },
      });
      if (!accepted) return;
    }
    const ids = apps.map((app) => app.id);
    setSpent(scan.data.sessionID);
    setRun({ key: pile.key, ids });
    strike.begin(ids.length);
    try {
      const result = await runMintSurface<MemoryRelease>(cli, {
        action: "memory.release",
        sessionID: scan.data.sessionID,
        itemIDs: ids,
        allowAdvanced: advanced,
        confirmed: true,
      });
      // Mint answers with names. Apps that share a name are struck only when
      // the answer names all of them; otherwise none is, since which one quit
      // cannot be told.
      const count = (names: string[], name: string) => names.filter((other) => other === name).length;
      const selectedNames = apps.map((app) => app.name);
      const done = apps
        .filter((app) => count(result.quitNames, app.name) >= count(selectedNames, app.name))
        .map((app) => app.id);
      strike.end(done, () => {
        setRun(undefined);
        setReceipt({ key: pile.key, bytes: result.freedBytes, text: "freed" });
      });
      const problems = [
        result.survivedNames.length ? `${result.survivedNames.join(", ")} kept running` : undefined,
        result.handlingReviewBlockedNames.length
          ? `${plural(result.handlingReviewBlockedNames.length, "app")} on your Ignore list`
          : undefined,
      ].filter(Boolean);
      if (problems.length) await showToast({ style: Toast.Style.Failure, title: problems.join(" · ") });
    } catch (error) {
      strike.end([], () => setRun(undefined));
      await showToast({
        style: Toast.Style.Failure,
        title: "Mint could not free memory",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const memoryLine =
    scan.data?.usedBytes && scan.data.totalBytes
      ? `${formatCompact(scan.data.usedBytes)} of ${formatCompact(scan.data.totalBytes)} in use`
      : undefined;
  const idle = piles.find((pile) => pile.key === "idle");

  return (
    <List
      isLoading={scan.isLoading || busy}
      isShowingDetail
      navigationTitle="Free Memory"
      searchBarPlaceholder={
        scan.data
          ? idle?.apps.length
            ? `${formatCompact(idle.bytes)} idle · ${memoryLine ?? ""}`
            : (memoryLine ?? "")
          : "Looking at what is running…"
      }
    >
      {scan.error && !scan.data ? (
        <List.EmptyView icon={Icon.Warning} title="Mint could not read memory" description={scan.error.message} />
      ) : null}
      {scan.data?.detailsUnavailable ? (
        <List.EmptyView
          icon={Icon.Lock}
          title="This Mint edition cannot quit other apps"
          description="Open Mint to see your memory."
        />
      ) : null}
      {scan.data && !scan.data.detailsUnavailable && piles.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="Nothing to quit"
          description={memoryLine ? `${memoryLine}. Every app left is part of macOS.` : undefined}
        />
      ) : null}
      {piles.length && !scan.data?.detailsUnavailable ? (
        <List.Section title="Memory" subtitle={memoryLine}>
          {piles.map((pile) => {
            const left = pile.apps.filter((app) => !strike.struck.has(app.id));
            const here = run?.key === pile.key ? run : undefined;
            const done = receipt?.key === pile.key && !busy ? receipt : undefined;
            return (
              <List.Item
                key={pile.key}
                id={pile.key}
                icon={{ source: Icon.CircleFilled, tintColor: pile.color }}
                title={pile.title}
                accessories={
                  done && left.length === 0
                    ? [
                        { icon: { source: Icon.CheckCircle, tintColor: pile.color } },
                        { text: `−${formatCompact(done.bytes)}` },
                      ]
                    : [
                        {
                          text: pile.apps.length ? formatCompact(left.reduce((sum, app) => sum + app.size, 0)) : "None",
                        },
                      ]
                }
                detail={
                  <List.Item.Detail
                    markdown={pilePicture(pile, piles, used, appearance, {
                      struck: strike.struck,
                      gone: strike.gone,
                      running: here
                        ? `Quitting · ${here.ids.filter((id) => strike.struck.has(id)).length} of ${here.ids.length}`
                        : undefined,
                      receipt: done,
                    })}
                  />
                }
                actions={
                  <ActionPanel>
                    {fresh && left.length && pile.key === "idle" ? (
                      <>
                        <Action
                          title="Quit All Idle Apps"
                          icon={Icon.MemoryChip}
                          onAction={() => release(pile, left)}
                        />
                        <Action.Push
                          title="Choose Apps"
                          icon={Icon.List}
                          shortcut={Keyboard.Shortcut.Common.Open}
                          target={<ChooseApps pile={pile} preselected onQuit={(apps) => release(pile, apps)} />}
                        />
                      </>
                    ) : fresh && left.length ? (
                      <Action.Push
                        title="Choose Apps to Quit"
                        icon={Icon.List}
                        target={<ChooseApps pile={pile} preselected={false} onQuit={(apps) => release(pile, apps)} />}
                      />
                    ) : null}
                    <ActionPanel.Section>
                      {!busy ? (
                        <Action
                          title="Look Again"
                          icon={Icon.ArrowClockwise}
                          shortcut={Keyboard.Shortcut.Common.Refresh}
                          onAction={lookAgain}
                        />
                      ) : null}
                      <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}

function ChooseApps({
  pile,
  preselected,
  onQuit,
}: {
  pile: Pile;
  preselected: boolean;
  onQuit: (apps: App[]) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [chosen, setChosen] = useState<Set<string>>(new Set(preselected ? pile.apps.map((app) => app.id) : []));
  const picked = pile.apps.filter((app) => chosen.has(app.id));
  const pickedBytes = picked.reduce((sum, app) => sum + app.size, 0);
  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const quit = async () => {
    pop();
    await onQuit(picked);
  };
  return (
    <List
      navigationTitle={picked.length ? `${formatCompact(pickedBytes)} chosen` : pile.title}
      searchBarPlaceholder={`Search ${pile.title.toLowerCase()} apps`}
    >
      {pile.apps.map((app) => {
        const isChosen = chosen.has(app.id);
        return (
          <List.Item
            key={app.id}
            icon={appIcon(app, pile.color)}
            title={app.name}
            subtitle={app.agentKind ? `running ${app.agentKind}` : undefined}
            accessories={[
              { text: formatCompact(app.size) },
              {
                icon: {
                  source: isChosen ? Icon.CheckCircle : Icon.Circle,
                  tintColor: isChosen ? Color.PrimaryText : Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={isChosen ? "Unchoose" : "Choose"}
                  icon={isChosen ? Icon.Circle : Icon.CheckCircle}
                  onAction={() => toggle(app.id)}
                />
                {picked.length ? (
                  <Action
                    title={`Quit ${plural(picked.length, "App")}`}
                    icon={Icon.MemoryChip}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={quit}
                  />
                ) : null}
                {app.bundlePath ? (
                  <Action.ShowInFinder path={app.bundlePath} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
                ) : null}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function appIcon(app: App, color: string): Image.ImageLike {
  return app.bundlePath ? { fileIcon: app.bundlePath } : { source: Icon.Terminal, tintColor: color };
}
