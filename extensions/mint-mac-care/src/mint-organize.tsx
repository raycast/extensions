import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  environment,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { openMint, plural, runMintSurface, shortPath } from "./mint-cli";
import { AutoCareJSON, folderCare, folderStatus } from "./mint-model";
import { savedFolderProgress } from "./mint-saved";

import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";
import { Folder, SortResult, TEMPLATES, Template, destinationsPicture, templateTitle } from "./mint-panes";
import { accent } from "./mint-visuals";
import { useStrike } from "./use-strike";

// Topics needs rules set up in Mint, so Raycast offers the other three.
const OFFERED = TEMPLATES.filter((template) => template.id !== "topics");

type OrganizeResponse = { preview: boolean; folder: string; result: SortResult };

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  return <FolderList cli={resolution.path} />;
}

function FolderList({ cli }: { cli: string }) {
  const folders = usePromise(
    async (path: string) => {
      const [listed, care] = await Promise.all([
        runMintSurface<{ folders: Folder[] }>(path, { action: "organize.folders" }, 30_000),
        runMintSurface<AutoCareJSON>(path, { action: "autocare.list" }, 30_000).catch(() => undefined),
      ]);
      return { folders: listed.folders.filter((folder) => folder.enabled !== false), care };
    },
    [cli],
    { failureToastOptions: { title: "Mint could not list its folders" } },
  );
  const saved = savedFolderProgress();

  const addFolder = (
    <Action.Push
      title="Add a Folder…"
      icon={Icon.NewFolder}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<AddFolder cli={cli} onAdded={folders.revalidate} />}
    />
  );

  return (
    <List
      isLoading={folders.isLoading}
      isShowingDetail={(folders.data?.folders.length ?? 0) > 0}
      navigationTitle="Organize a Folder"
      searchBarPlaceholder="Filter folders"
    >
      {!folders.isLoading && (folders.data?.folders.length ?? 0) === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No folders yet"
          description="Add Desktop, Downloads or any folder, pick a template, and Mint sorts its loose files."
          actions={<ActionPanel>{addFolder}</ActionPanel>}
        />
      ) : null}
      {folders.data?.folders.map((folder) => (
        <FolderRow
          key={folder.path}
          cli={cli}
          folder={folder}
          care={folderCare(folder.path, folders.data?.care, folder.organizeOnArrival)}
          saved={saved[folder.path]}
          addFolder={addFolder}
          onChanged={folders.revalidate}
        />
      ))}
    </List>
  );
}

/**
 * One folder: how many loose files it would sort (the dropdown's last count
 * at once, then a fresh preview), and on the right where they go. ↵
 * organizes it.
 */
function FolderRow({
  cli,
  folder,
  care,
  saved,
  addFolder,
  onChanged,
}: {
  cli: string;
  folder: Folder;
  care: string;
  saved: number | undefined;
  addFolder: React.ReactElement;
  onChanged: () => void;
}) {
  const name = folderName(folder.path);
  const [run, setRun] = useState<{ categories: string[] } | undefined>();
  const [receipt, setReceipt] = useState<{ text: string } | undefined>();
  const strike = useStrike();
  const preview = usePromise(
    async (path: string, target: string) =>
      runMintSurface<OrganizeResponse>(path, { action: "organize.preview", path: target }, 10 * 60_000),
    [cli, folder.path],
  );
  // The plan the pane drew stays on screen through a run, so its rows can be struck.
  const [plan, setPlan] = useState<SortResult | undefined>();
  const result = plan ?? preview.data?.result;
  const toSort = result?.filesMoved ?? saved;
  const appearance = environment.appearance === "light" ? "light" : "dark";
  const busy = Boolean(run) || strike.active;

  /**
   * The folder's destinations are struck as their files land, and the window
   * stays open with the result where the plan was. It used to close with a
   * HUD, which read as Raycast quitting (Yukun's recording, 2026-09-30).
   */
  async function organize() {
    if (busy) return;
    const planned = preview.data?.result;
    const categories = Object.entries(planned?.categoryCounts ?? {})
      .filter(([, count]) => count > 0)
      .map(([category]) => category);
    setPlan(planned);
    setReceipt(undefined);
    strike.reset();
    setRun({ categories });
    strike.begin(categories.length);
    try {
      const response = await runMintSurface<OrganizeResponse>(
        cli,
        { action: "organize.run", path: folder.path, confirmed: true },
        10 * 60_000,
      );
      const moved = response.result.filesMoved;
      const failed = Math.max(response.result.errors?.length ?? 0, response.result.organizeFailures?.length ?? 0);
      const landed = Object.entries(response.result.categoryCounts ?? {})
        .filter(([, count]) => count > 0)
        .map(([category]) => category);
      const folders = landed.length;
      strike.end(landed, () => {
        setRun(undefined);
        setReceipt({
          text:
            moved === 0
              ? "already tidy"
              : failed
                ? `${plural(moved, "file")} sorted · ${failed} could not move`
                : `${plural(moved, "file")} sorted into ${plural(folders, "folder")}`,
        });
        setPlan(undefined);
        preview.revalidate();
        onChanged();
      });
      if (failed) {
        await showToast({
          style: Toast.Style.Failure,
          title: `${failed} could not move`,
          message:
            response.result.organizeFailures?.[0]?.message ?? response.result.errors?.[0] ?? "macOS refused the move.",
        });
      }
    } catch (error) {
      strike.end([], () => {
        setRun(undefined);
        setPlan(undefined);
      });
      await showToast({
        style: Toast.Style.Failure,
        title: `Mint could not organize ${name}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function setTemplate(mode: Template) {
    setReceipt(undefined);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Changing the template…" });
    try {
      await runMintSurface(cli, { action: "organize.configure", path: folder.path, mode, confirmed: true }, 60_000);
      toast.style = Toast.Style.Success;
      toast.title = `${name} sorts ${templateTitle(mode).toLowerCase()}`;
      onChanged();
      preview.revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Mint could not change the template";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List.Item
      icon={{ fileIcon: folder.path }}
      title={name}
      accessories={[
        preview.isLoading && toSort === undefined
          ? { icon: Icon.CircleProgress, tooltip: "Mint is looking at its files" }
          : receipt && !busy && toSort === 0
            ? { icon: { source: Icon.CheckCircle, tintColor: accent(appearance) }, text: "Tidy" }
            : {
                text: busy ? "Organizing" : folderStatus(toSort),
                tooltip: preview.isLoading ? "Mint is checking again" : undefined,
              },
      ]}
      detail={
        <List.Item.Detail
          isLoading={preview.isLoading}
          markdown={destinationsPicture(folder, care, result, toSort, appearance, {
            struck: strike.struck,
            gone: strike.gone,
            running: run
              ? `Organizing · ${run.categories.filter((category) => strike.struck.has(category)).length} of ${run.categories.length} folders`
              : undefined,
            receipt: receipt && !busy ? { bytes: 0, text: receipt.text } : undefined,
          })}
        />
      }
      actions={
        <ActionPanel>
          {!busy && (toSort ?? 1) > 0 && preview.data ? (
            <Action title={`Organize ${name}`} icon={Icon.Wand} onAction={organize} />
          ) : null}
          <Action.Push
            title="See Every File"
            icon={Icon.List}
            shortcut={Keyboard.Shortcut.Common.Open}
            target={<OrganizePreview cli={cli} folder={folder} onOrganize={organize} />}
          />
          <ActionPanel.Submenu
            title="Change Template"
            icon={Icon.AppWindowGrid2x2}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          >
            {OFFERED.map((template) => (
              <Action
                key={template.id}
                title={template.title}
                icon={template.id === folder.organizeTemplate ? Icon.CheckCircle : Icon.Circle}
                onAction={() => setTemplate(template.id)}
              />
            ))}
          </ActionPanel.Submenu>
          {addFolder}
          <ActionPanel.Section>
            <Action.ShowInFinder path={folder.path} />
            <Action
              title="Preview Again"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => {
                setReceipt(undefined);
                preview.revalidate();
              }}
            />
            <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function OrganizePreview({ cli, folder, onOrganize }: { cli: string; folder: Folder; onOrganize: () => void }) {
  const { pop } = useNavigation();
  const name = folderName(folder.path);
  const preview = usePromise(
    async (path: string, target: string) =>
      runMintSurface<OrganizeResponse>(path, { action: "organize.preview", path: target }, 10 * 60_000),
    [cli, folder.path],
    { failureToastOptions: { title: "Mint could not preview this folder" } },
  );
  const result = preview.data?.result;
  const groups = Object.entries(result?.categoryCounts ?? {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  const kept = result?.needsReviewPaths ?? [];

  // Back to the folder first, so its destinations are struck where the person is looking.
  const organize = () => {
    pop();
    onOrganize();
  };

  const actions = (
    <ActionPanel>
      {result && result.filesMoved > 0 ? (
        <Action title={`Organize ${name}`} icon={Icon.Wand} onAction={organize} />
      ) : null}
      <Action.ShowInFinder path={folder.path} />
      <Action
        title="Preview Again"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={preview.revalidate}
      />
    </ActionPanel>
  );

  return (
    <List
      isLoading={preview.isLoading}
      navigationTitle={`Organize ${name} ${templateTitle(folder.organizeTemplate).toLowerCase()}`}
    >
      {!preview.isLoading && result && result.filesMoved === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title={`${name} is tidy`}
          description={`Every loose file is already where ${templateTitle(folder.organizeTemplate).toLowerCase()} puts it.`}
          actions={actions}
        />
      ) : null}
      {groups.map(([category, count]) => {
        const samples = result?.plannedSamples?.[category] ?? [];
        return (
          <List.Section key={category} title={category} subtitle={`${plural(count, "file")} will move here`}>
            {samples.map((sample) => (
              <List.Item
                key={sample}
                icon={{ fileIcon: `${folder.path}/${sample}` }}
                title={sample}
                accessories={[{ text: `→ ${category}` }]}
                actions={actions}
              />
            ))}
            {count > samples.length ? (
              <List.Item
                icon={Icon.Ellipsis}
                title={`and ${plural(count - samples.length, "more file")}`}
                actions={actions}
              />
            ) : null}
          </List.Section>
        );
      })}
      {result && (result.alreadyInPlaceCount ?? 0) > 0 && result.filesMoved > 0 ? (
        <List.Section title="Already in place">
          <List.Item
            icon={Icon.CheckCircle}
            title={`${plural(result.alreadyInPlaceCount ?? 0, "file")} already sit where this template puts them`}
            actions={actions}
          />
        </List.Section>
      ) : null}
      {kept.length ? (
        <List.Section title="Stay where they are" subtitle="On your Ignore list">
          {kept.map((path) => (
            <List.Item
              key={path}
              icon={{ fileIcon: path }}
              title={folderName(path)}
              subtitle={shortPath(path)}
              actions={actions}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function AddFolder({ cli, onAdded }: { cli: string; onAdded: () => void }) {
  const { pop } = useNavigation();
  async function submit(values: { folder: string[]; template: Template }) {
    const path = values.folder[0];
    if (!path) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a folder" });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding the folder…" });
    try {
      await runMintSurface(cli, { action: "organize.add", path, confirmed: true }, 60_000);
      await runMintSurface(cli, { action: "organize.configure", path, mode: values.template, confirmed: true }, 60_000);
      toast.style = Toast.Style.Success;
      toast.title = `${folderName(path)} added`;
      toast.message = "Nothing moves until you organize it.";
      onAdded();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Mint could not add this folder";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }
  return (
    <Form
      navigationTitle="Add a Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Folder" icon={Icon.NewFolder} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.Dropdown id="template" title="Sort its files" defaultValue="media">
        {OFFERED.map((template) => (
          <Form.Dropdown.Item key={template.id} value={template.id} title={template.title} />
        ))}
      </Form.Dropdown>
      <Form.Description text="Nothing moves when you add it. Preview first, then organize; every move can be undone." />
    </Form>
  );
}

function folderName(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}
