import { Action, ActionPanel, Detail, Icon, Keyboard, LaunchType, environment, launchCommand } from "@raycast/api";
import { showFailureToast, useExec, usePromise } from "@raycast/utils";
import { canRevalidateMintCLI, formatCompact, openMint, parseMintCommandJSON, runMintSurface } from "./mint-cli";
import { AutoCareJSON, MemoryJSON, StatusJSON, diskCard, folderCards, memoryCard } from "./mint-model";
import { nudgeCard, notifyLevel, parseIslandHistory } from "./mint-nudge";
import { mintDefault, savedFolderProgress, savedGroups, savedIslandHistory } from "./mint-saved";
import { GLANCE_WIDTH, glanceSVG, markdownImage } from "./mint-visuals";
import { AutoCareAction } from "./mint-actions";
import { MissingMint } from "./missing-mint";
import { allowanceLine } from "./mint-parity";
import type { AccessAnswer } from "./mint-parity";
import { useMintCLI } from "./use-mint-cli";
import { PlanWall } from "./plan-wall";
import { NEW_WORDS } from "./mint-plan";

type Folder = { path: string; enabled?: boolean; organizeOnArrival?: boolean };
type Preview = { result?: { filesMoved?: number } };

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  const cli = resolution.status === "ready" ? resolution.path : undefined;
  const status = useExec(cli ?? "/usr/bin/false", ["status", "--json"], { execute: Boolean(cli), timeout: 30_000 });
  const care = usePromise(
    async (path: string) => runMintSurface<AutoCareJSON>(path, { action: "autocare.list" }, 30_000),
    [cli ?? ""],
    { execute: Boolean(cli) },
  );
  const memory = usePromise(
    async (path: string) => runMintSurface<MemoryJSON>(path, { action: "memory.scan" }, 60_000),
    [cli ?? ""],
    { execute: Boolean(cli) },
  );
  const folders = usePromise(
    async (path: string) => {
      const listed = await runMintSurface<{ folders: Folder[] }>(path, { action: "organize.folders" }, 30_000);
      return listed.folders.filter((folder) => folder.enabled !== false);
    },
    [cli ?? ""],
    { execute: Boolean(cli) },
  );
  // The free week's allowance, as the app's plan button says it (none on a plan without a limit).
  const access = usePromise(
    async (path: string) => runMintSurface<AccessAnswer>(path, { action: "access.check" }, 30_000),
    [cli ?? ""],
    { execute: Boolean(cli) },
  );
  // The person's level for notes about space to get back (Mint 1.1.2's Notify me).
  const level = usePromise(async () =>
    notifyLevel(await mintDefault("Mint.Island.FoundNotifyOn"), await mintDefault("Mint.Island.FoundNotifyGB")),
  );
  // How many files each shown folder would sort: the dropdown's own dry run.
  const shown = (folders.data ?? []).slice(0, 2);
  const toSort = usePromise(
    async (path: string, paths: string[]) => {
      const counts = await Promise.all(
        paths.map((target) =>
          runMintSurface<Preview>(path, { action: "organize.preview", path: target }, 120_000).then(
            (preview) => preview.result?.filesMoved,
            () => undefined,
          ),
        ),
      );
      return Object.fromEntries(paths.map((target, index) => [target, counts[index]]));
    },
    [cli ?? "", shown.map((folder) => folder.path)],
    { execute: Boolean(cli) && shown.length > 0 },
  );

  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;

  const stated = parseMintCommandJSON<StatusJSON>(status.data, "status.v1");
  // Mint 1.0.80's CLI does not state the groups; the file it saves after a
  // Scan does, and the menu bar's ring reads the same file.
  const parsed = stated && !stated.groups ? { ...stated, groups: savedGroups() } : stated;
  const failure = status.error?.message ?? parsed?.error;
  const appearance = environment.appearance === "light" ? "light" : "dark";
  // The dropdown's last count shows at once; the fresh preview replaces it.
  const saved = savedFolderProgress();

  // The island's Get back card, from the same groups as the Disk card (Mint 1.1.2).
  const nudge = parsed
    ? nudgeCard(
        resolution.version.appVersion,
        parsed.groups,
        parseIslandHistory(savedIslandHistory()),
        level.data,
        Date.now(),
      )
    : undefined;
  let markdown = "";
  if (failure) {
    markdown = `## Mint could not read its status\n\n${failure}`;
  } else if (parsed) {
    const { svg, height } = glanceSVG({
      appearance,
      format: formatCompact,
      nudge,
      disk: diskCard(parsed, care.data, formatCompact, Boolean(nudge)),
      memory: memoryCard(memory.data, care.data, formatCompact),
      folders: folderCards(
        shown.map((folder) => ({ ...folder, toSort: toSort.data?.[folder.path] ?? saved[folder.path] })),
        care.data,
      ),
      moreFolders: Math.max(0, (folders.data?.length ?? 0) - shown.length),
    });
    markdown = markdownImage(svg, GLANCE_WIDTH, height, "Mint");
    const allowance = allowanceLine(access.data);
    if (allowance) markdown += `\n\n${allowance}`;
  }

  const refresh = () => {
    if (!canRevalidateMintCLI(cli, recheck())) return;
    status.revalidate();
    care.revalidate();
    memory.revalidate();
    folders.revalidate();
    level.revalidate();
    access.revalidate();
  };
  const open = (name: string, title: string) => async () => {
    try {
      await launchCommand({ name, type: LaunchType.UserInitiated });
    } catch (error) {
      // Raycast refuses when that command is turned off in its settings.
      await showFailureToast(error, { title: `Could not open ${title}` });
    }
  };

  return (
    <Detail
      isLoading={status.isLoading || care.isLoading || memory.isLoading || folders.isLoading || toSort.isLoading}
      navigationTitle="Mac Status"
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Free Disk" icon={Icon.HardDrive} onAction={open("mint-scan", "Free Disk")} />
            <Action title="Optimize Storage" icon={Icon.Stars} onAction={open("mint-optimize", "Optimize Storage")} />
            <Action title="Free Memory" icon={Icon.MemoryChip} onAction={open("mint-memory", "Free Memory")} />
            <Action
              title="Organize a Folder"
              icon={Icon.Folder}
              onAction={open("mint-organize", "Organize a Folder")}
            />
            <Action title="Show Disk Growth" icon={Icon.LineChart} onAction={open("mint-why", "Show Disk Growth")} />
            <Action title="Mint History" icon={Icon.Clock} onAction={open("mint-history", "Mint History")} />
            <AutoCareAction context={{ section: "disk" }} />
            <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
          </ActionPanel.Section>
          {cli && access.data?.plan === false ? (
            <ActionPanel.Section>
              {/* The plan wall (2026-11-10): what Mint did here, what is waiting, and the plans. */}
              <Action.Push
                title={NEW_WORDS.goUnlimitedAction}
                icon={Icon.Stars}
                target={<PlanWall cli={cli} version={resolution.status === "ready" ? resolution.version : undefined} />}
              />
            </ActionPanel.Section>
          ) : null}
          {nudge ? (
            <ActionPanel.Section>
              {/* Raycast writes no Mint setting: the level is changed in Mint. */}
              <Action title="Change Notify Me in Mint" icon={Icon.Bell} onAction={openMint} />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={refresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
