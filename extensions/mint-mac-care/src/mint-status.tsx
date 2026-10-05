import { Action, ActionPanel, Detail, Icon, Keyboard, LaunchType, environment, launchCommand } from "@raycast/api";
import { useExec, usePromise } from "@raycast/utils";
import { canRevalidateMintCLI, formatCompact, openMint, parseMintCommandJSON, runMintSurface } from "./mint-cli";
import { AutoCareJSON, MemoryJSON, StatusJSON, diskCard, folderCards, memoryCard } from "./mint-model";
import { savedFolderProgress, savedGroups } from "./mint-saved";
import { GLANCE_WIDTH, glanceSVG, markdownImage } from "./mint-visuals";
import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";

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

  let markdown = "";
  if (failure) {
    markdown = `## Mint could not read its status\n\n${failure}`;
  } else if (parsed) {
    const { svg, height } = glanceSVG({
      appearance,
      format: formatCompact,
      disk: diskCard(parsed, care.data, formatCompact),
      memory: memoryCard(memory.data, care.data, formatCompact),
      folders: folderCards(
        shown.map((folder) => ({ ...folder, toSort: toSort.data?.[folder.path] ?? saved[folder.path] })),
        care.data,
      ),
      moreFolders: Math.max(0, (folders.data?.length ?? 0) - shown.length),
    });
    markdown = markdownImage(svg, GLANCE_WIDTH, height, "Mint");
  }

  const refresh = () => {
    if (!canRevalidateMintCLI(cli, recheck())) return;
    status.revalidate();
    care.revalidate();
    memory.revalidate();
    folders.revalidate();
  };
  const open = (name: string) => () => launchCommand({ name, type: LaunchType.UserInitiated });

  return (
    <Detail
      isLoading={status.isLoading || care.isLoading || memory.isLoading || folders.isLoading || toSort.isLoading}
      navigationTitle="Mac Status"
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Free Disk" icon={Icon.HardDrive} onAction={open("mint-scan")} />
            <Action title="Optimize Storage" icon={Icon.Stars} onAction={open("mint-optimize")} />
            <Action title="Free Memory" icon={Icon.MemoryChip} onAction={open("mint-memory")} />
            <Action title="Organize a Folder" icon={Icon.Folder} onAction={open("mint-organize")} />
            <Action title="Show Disk Growth" icon={Icon.LineChart} onAction={open("mint-why")} />
            <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
          </ActionPanel.Section>
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
