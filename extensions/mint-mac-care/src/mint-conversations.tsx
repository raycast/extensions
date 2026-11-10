import { Action, ActionPanel, Icon, Keyboard, List, Toast, environment, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { useEffect, useState } from "react";
import { formatCompact, openMint, plural, shortPath } from "./mint-cli";
import { MissingMint } from "./missing-mint";
import { NeedsNewerMint, RetryActions, chosenAccessory, runConfirmedInMint, useChosen } from "./confirm-in-mint";
import { usePlanWall } from "./plan-wall";
import {
  NATIVE_APPROVAL_CAPABILITY,
  PICTURES_PER_REQUEST,
  conversationReceipt,
  conversationRows,
  hasCapability,
  pictureRemovalReceipt,
  pictureRows,
  picturesChanged,
  runParity,
  transcriptReceipt,
} from "./mint-parity";
import type {
  ConversationFamily,
  ConversationResult,
  ConversationScan,
  ConversationVerb,
  Picture,
  PicturePreview,
  PictureResult,
  PictureScan,
  Transcript,
  TranscriptResult,
  TranscriptScan,
} from "./mint-parity";
import { useMintCLI } from "./use-mint-cli";
import { keptSizes } from "./mint-plan";

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  if (!hasCapability(resolution.version, NATIVE_APPROVAL_CAPABILITY))
    return <NeedsNewerMint command="AI Conversations" />;
  return <Conversations cli={resolution.path} />;
}

type Archive = { id: string; title: string; path: string; sizeBytes: number; estimatedSaving: number };
type ArchiveScan = { sessionID: string; agentArchives?: { complete: boolean; candidates: Archive[] } };
type ArchiveResult = { optimizedCount?: number; savedBytes?: number; quotaBlockedCount?: number; failures?: unknown[] };

/** Where a picture's preview is written for Raycast to draw: copies of the person's pictures. */
function previewFolder(): string {
  return join(environment.supportPath, "pictures");
}

/**
 * Previews live only while a picture review is open: cleared when a review
 * opens and closes, after pictures are removed, and when the command opens
 * (a review Raycast closed without unmounting it). Best effort: the next of
 * those clears what this one could not.
 */
function clearPreviews(): void {
  try {
    rmSync(previewFolder(), { recursive: true, force: true });
  } catch {
    // Left for the next clear; nothing the person did depends on it.
  }
}

/**
 * The conversations AI tools keep, as Mint's Disk page lists them: Codex's,
 * family by family (a conversation and its linked copies go together), and
 * Claude Code's transcripts that hold pictures. Optimize, remove pictures or
 * delete; every change is confirmed in Mint's own window. Archived Codex
 * conversations Mint can store smaller are found on request (a full Scan).
 */
function Conversations({ cli }: { cli: string }) {
  useEffect(clearPreviews, []);
  const wall = usePlanWall(cli);
  const codex = usePromise(
    async (path: string) => runParity<ConversationScan>(path, { action: "agents.scan" }, 10 * 60_000),
    [cli],
  );
  const claude = usePromise(
    async (path: string) => runParity<TranscriptScan>(path, { action: "disk.compress.scan" }, 10 * 60_000),
    [cli],
  );
  const [archivesAsked, setArchivesAsked] = useState(false);
  const archives = usePromise(
    async (path: string) =>
      runParity<ArchiveScan>(path, { action: "disk.scan", includeAgentArchives: true }, 30 * 60_000),
    [cli],
    { execute: archivesAsked },
  );
  const { chosen, toggle, clear } = useChosen();
  const families = conversationRows(codex.data);
  const transcripts = [...(claude.data?.items ?? [])].sort((a, b) => b.sizeBytes - a.sizeBytes);
  const archiveRows = archives.data?.agentArchives?.candidates ?? [];
  const chosenFamilies = families.filter((family) => chosen.has(family.id));
  const chosenTranscripts = transcripts.filter((transcript) => chosen.has(transcript.id));

  const lookAgain = () => {
    clear();
    codex.revalidate();
    claude.revalidate();
    if (archivesAsked) archives.revalidate();
  };

  async function onFamilies(verb: ConversationVerb, rows: ConversationFamily[]) {
    if (!codex.data || rows.length === 0) return;
    await runConfirmedInMint<ConversationResult>(
      cli,
      {
        action: verb,
        sessionID: codex.data.sessionID,
        itemIDs: rows.map((row) => row.id),
        ...(verb === "agents.delete" ? { permanent: true } : {}),
      },
      {
        done: (result) => conversationReceipt(verb, result),
        failed: "Mint could not change these conversations",
        kept: (result) =>
          keptSizes(
            result.failures,
            rows,
            (row) => row.paths,
            (row) => row.bytes,
          ),
      },
      wall,
    );
    lookAgain();
  }

  async function onTranscripts(rows: Transcript[]) {
    if (!claude.data || rows.length === 0) return;
    await runConfirmedInMint<TranscriptResult>(
      cli,
      { action: "disk.compress", sessionID: claude.data.sessionID, itemIDs: rows.map((row) => row.id) },
      {
        done: transcriptReceipt,
        failed: "Mint could not remove these pictures",
        kept: (result) =>
          keptSizes(
            result.failures,
            rows,
            (row) => [row.path],
            (row) => row.sizeBytes,
          ),
      },
      wall,
    );
    lookAgain();
  }

  async function onArchives(rows: Archive[]) {
    if (!archives.data || rows.length === 0) return;
    await runConfirmedInMint<ArchiveResult>(
      cli,
      { action: "agent.optimize", sessionID: archives.data.sessionID, agentIDs: rows.map((row) => row.id) },
      {
        done: (result) =>
          `${plural(result.optimizedCount ?? 0, "archive")} optimized · ${formatCompact(result.savedBytes ?? 0)} back`,
        failed: "Mint could not optimize these archives",
        held: (result) => (result.quotaBlockedCount ?? 0) > 0,
      },
      wall,
    );
    archives.revalidate();
  }

  const isLoading = codex.isLoading || claude.isLoading || (archivesAsked && archives.isLoading);
  const total =
    families.reduce((sum, family) => sum + family.bytes, 0) + transcripts.reduce((sum, row) => sum + row.sizeBytes, 0);

  const common = (
    <ActionPanel.Section>
      {!archivesAsked ? (
        <Action
          title="Find Archived Conversations to Optimize"
          icon={Icon.MagnifyingGlass}
          onAction={() => setArchivesAsked(true)}
        />
      ) : null}
      <Action
        title="Look Again"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={lookAgain}
      />
      <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        isLoading && !total ? "Reading AI conversations…" : `${formatCompact(total)} in AI conversations`
      }
    >
      {codex.error ? (
        <List.Section title="Codex">
          <List.Item
            icon={Icon.Warning}
            title="Mint could not read Codex's conversations"
            subtitle={codex.error.message}
            actions={<RetryActions onRetry={codex.revalidate} />}
          />
        </List.Section>
      ) : null}
      <List.Section title="Codex" subtitle={families.length ? plural(families.length, "conversation") : undefined}>
        {families.map((family) => {
          const isChosen = chosen.has(family.id);
          const rows = isChosen && chosenFamilies.length ? chosenFamilies : [family];
          const many = rows.length > 1 ? ` ${plural(rows.length, "Conversation")}` : "";
          return (
            <List.Item
              key={family.id}
              icon={Icon.Message}
              title={family.title || "Untitled conversation"}
              subtitle={[
                family.archived ? "Archived" : undefined,
                family.conversations > 1 ? `${family.conversations} linked copies` : undefined,
              ]
                .filter(Boolean)
                .join(" · ")}
              accessories={[{ text: formatCompact(family.bytes) }, chosenAccessory(isChosen)]}
              actions={
                <ActionPanel>
                  <Action
                    title={isChosen ? "Unchoose" : "Choose"}
                    icon={isChosen ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => toggle(family.id)}
                  />
                  <Action.Push
                    title="Review Pictures"
                    icon={Icon.Image}
                    target={
                      <Pictures
                        cli={cli}
                        source="conversations"
                        sessionID={codex.data!.sessionID}
                        itemIDs={rows.map((row) => row.id)}
                      />
                    }
                  />
                  {codex.data?.optimizationAvailable ? (
                    <Action
                      title={`Optimize${many}…`}
                      icon={Icon.Stars}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      onAction={() => onFamilies("agents.optimize", rows)}
                    />
                  ) : null}
                  <Action
                    title={`Remove Pictures${many ? ` from${many}` : ""}…`}
                    icon={Icon.EyeDisabled}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    onAction={() => onFamilies("agents.remove-media", rows)}
                  />
                  <Action
                    title={`Delete${many || " Conversation"}…`}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                    onAction={() => onFamilies("agents.delete", rows)}
                  />
                  {family.paths[0] ? <Action.ShowInFinder path={family.paths[0]} /> : null}
                  {common}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {claude.error ? (
        <List.Section title="Claude Code">
          <List.Item
            icon={Icon.Warning}
            title="Mint could not read Claude Code's conversations"
            subtitle={claude.error.message}
            actions={<RetryActions onRetry={claude.revalidate} />}
          />
        </List.Section>
      ) : null}
      <List.Section title="Claude Code" subtitle={transcripts.length ? "Conversations with pictures" : undefined}>
        {transcripts.map((transcript) => {
          const isChosen = chosen.has(transcript.id);
          const rows = isChosen && chosenTranscripts.length ? chosenTranscripts : [transcript];
          const many = rows.length > 1 ? ` from ${plural(rows.length, "Conversation")}` : "";
          return (
            <List.Item
              key={transcript.id}
              icon={Icon.Message}
              title={transcript.label}
              subtitle={shortPath(transcript.path)}
              accessories={[{ text: `${formatCompact(transcript.sizeBytes)} in pictures` }, chosenAccessory(isChosen)]}
              actions={
                <ActionPanel>
                  <Action
                    title={isChosen ? "Unchoose" : "Choose"}
                    icon={isChosen ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => toggle(transcript.id)}
                  />
                  <Action.Push
                    title="Review Pictures"
                    icon={Icon.Image}
                    target={
                      <Pictures
                        cli={cli}
                        source="compression"
                        sessionID={claude.data!.sessionID}
                        itemIDs={rows.map((row) => row.id)}
                      />
                    }
                  />
                  <Action
                    title={`Remove Pictures${many}…`}
                    icon={Icon.EyeDisabled}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    onAction={() => onTranscripts(rows)}
                  />
                  <Action.ShowInFinder path={transcript.path} />
                  {common}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {archivesAsked ? (
        <List.Section title="Codex archives Mint can store smaller">
          {archives.error ? (
            <List.Item
              icon={Icon.Warning}
              title="Mint could not look"
              subtitle={archives.error.message}
              actions={<RetryActions onRetry={archives.revalidate} />}
            />
          ) : null}
          {archiveRows.map((archive) => {
            const isChosen = chosen.has(archive.id);
            const rows = isChosen ? archiveRows.filter((row) => chosen.has(row.id)) : [archive];
            return (
              <List.Item
                key={archive.id}
                icon={Icon.Box}
                title={archive.title}
                subtitle={`saves about ${formatCompact(archive.estimatedSaving)}`}
                accessories={[{ text: formatCompact(archive.sizeBytes) }, chosenAccessory(isChosen)]}
                actions={
                  <ActionPanel>
                    <Action
                      title={isChosen ? "Unchoose" : "Choose"}
                      icon={isChosen ? Icon.Circle : Icon.CheckCircle}
                      onAction={() => toggle(archive.id)}
                    />
                    <Action.ShowInFinder path={archive.path} />
                    <Action
                      title={rows.length > 1 ? `Optimize ${plural(rows.length, "Archive")}…` : "Optimize Archive…"}
                      icon={Icon.Stars}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      onAction={() => onArchives(rows)}
                    />
                    {common}
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

/**
 * The pictures inside the chosen conversations, one by one, with a preview on
 * the right. Keep spares a picture from later picture removal; Remove takes
 * only the ticked ones (unticked ones are kept, as the app's drawer does), at
 * most PICTURES_PER_REQUEST at a time.
 */
function Pictures({
  cli,
  source,
  sessionID,
  itemIDs,
}: {
  cli: string;
  source: "conversations" | "compression";
  sessionID: string;
  itemIDs: string[];
}) {
  const { pop } = useNavigation();
  const wall = usePlanWall(cli);
  useEffect(() => {
    clearPreviews();
    return clearPreviews;
  }, []);
  const [review, setReview] = useState<PictureScan | undefined>();
  const scan = usePromise(
    async (path: string) =>
      runParity<PictureScan>(path, { action: "pictures.scan", source, sessionID, itemIDs }, 5 * 60_000),
    [cli],
    { onData: setReview },
  );
  const [selected, setSelected] = useState<string | undefined>();
  const { chosen, toggle, clear } = useChosen();
  const rows = pictureRows(review);
  const picked = rows.filter((row) => chosen.has(row.id));
  const preview = usePromise(
    async (path: string, session: string, id: string) => {
      const answer = await runParity<PicturePreview>(
        path,
        { action: "pictures.preview", sessionID: session, itemID: id },
        60_000,
      );
      const folder = previewFolder();
      mkdirSync(folder, { recursive: true });
      const file = join(folder, `${id.replace(/[^A-Za-z0-9]/g, "")}.png`);
      writeFileSync(file, Buffer.from(answer.previewImage.data, "base64"));
      return { id, file };
    },
    [cli, review?.sessionID ?? "", selected ?? ""],
    { execute: Boolean(review?.sessionID && selected) },
  );

  /** Ticks one more picture, up to what one request to Mint takes. */
  function choose(id: string) {
    if (!chosen.has(id) && picked.length >= PICTURES_PER_REQUEST) {
      void showToast({
        style: Toast.Style.Failure,
        title: `Choose up to ${PICTURES_PER_REQUEST} pictures at a time`,
        message: "Remove or keep these, then choose more.",
      });
      return;
    }
    toggle(id);
  }

  async function keep(pictures: Picture[], kept: boolean) {
    if (!review || pictures.length === 0) return;
    const itemIDs = pictures.slice(0, PICTURES_PER_REQUEST).map((picture) => picture.id);
    const request = { action: "pictures.keep", sessionID: review.sessionID, itemIDs, kept };
    // What Mint says it changed, never what was asked (Mint's own count without a fresh review).
    const changed = (answer: PictureResult) =>
      picturesChanged(itemIDs, answer, kept) ?? answer.updatedPictureCount ?? 0;
    let result: PictureResult | undefined;
    if (kept) {
      // Keeping only spares pictures: Mint saves it without its window, as in MCP.
      try {
        result = await runParity<PictureResult>(cli, { ...request, confirmed: true });
        await showToast({ style: Toast.Style.Success, title: `Keeping ${plural(changed(result), "picture")}` });
      } catch (keepError) {
        await showFailureToast(keepError, { title: "Mint could not save the Keep choice" });
      }
    } else {
      result = await runConfirmedInMint<PictureResult>(cli, request, {
        done: (answer) => `${plural(changed(answer), "picture")} no longer kept`,
        failed: "Mint could not save the Keep choice",
      });
    }
    // The choice stays ticked when nothing was saved, to try again.
    if (result) clear();
    if (result?.review) setReview(result.review);
    else scan.revalidate();
  }

  async function remove(pictures: Picture[]) {
    if (!review || pictures.length === 0) return;
    const itemIDs = pictures.slice(0, PICTURES_PER_REQUEST).map((picture) => picture.id);
    const result = await runConfirmedInMint<PictureResult>(
      cli,
      { action: "pictures.remove", sessionID: review.sessionID, itemIDs },
      {
        done: (answer) => pictureRemovalReceipt(itemIDs, answer),
        failed: "Mint could not remove these pictures",
        kept: (answer) =>
          keptSizes(
            answer.failures,
            pictures.slice(0, PICTURES_PER_REQUEST),
            (picture) => [picture.id, ...picture.files],
            (picture) => picture.estimatedSavingBytes,
          ),
      },
      wall,
    );
    if (result) {
      clear();
      // The removed pictures' previews go with them.
      clearPreviews();
    }
    if (result?.review) setReview(result.review);
    else if (result) pop();
    else scan.revalidate();
  }

  return (
    <List
      isLoading={scan.isLoading || preview.isLoading}
      isShowingDetail={rows.length > 0}
      navigationTitle={picked.length ? `${plural(picked.length, "picture")} chosen` : "Pictures"}
      onSelectionChange={(id) => setSelected(id ?? undefined)}
      searchBarPlaceholder={
        review
          ? rows.length > PICTURES_PER_REQUEST
            ? `${plural(rows.length, "picture")} · choose up to ${PICTURES_PER_REQUEST} at a time`
            : plural(rows.length, "picture")
          : "Reading the pictures…"
      }
    >
      {scan.error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Mint could not read the pictures"
          description={scan.error.message}
          actions={<RetryActions onRetry={scan.revalidate} />}
        />
      ) : null}
      {rows.map((picture) => {
        const isChosen = chosen.has(picture.id);
        // Only this picture's own preview: the one before stays in `data` while the next loads.
        const markdown =
          selected === picture.id && preview.data?.id === picture.id
            ? `![](${encodeURI(`file://${preview.data.file}`)}?raycast-height=350)`
            : "";
        return (
          <List.Item
            key={picture.id}
            id={picture.id}
            // The detail pane hides accessories, so the icon says what is chosen.
            icon={isChosen ? Icon.CheckCircle : picture.kept ? Icon.Pin : Icon.Image}
            title={picture.kept ? "Kept" : formatCompact(picture.estimatedSavingBytes)}
            subtitle={picture.copies > 1 ? `${picture.copies} copies` : undefined}
            detail={<List.Item.Detail markdown={markdown} />}
            actions={
              <ActionPanel>
                <Action
                  title={isChosen ? "Unchoose" : "Choose"}
                  icon={isChosen ? Icon.Circle : Icon.CheckCircle}
                  onAction={() => choose(picture.id)}
                />
                {picture.files[0] ? (
                  <Action.ShowInFinder title="Show Conversation in Finder" path={picture.files[0]} />
                ) : null}
                {picture.kept ? (
                  <Action title="Stop Keeping…" icon={Icon.PinDisabled} onAction={() => keep([picture], false)} />
                ) : (
                  <Action
                    title={picked.length ? `Keep ${plural(picked.length, "Chosen Picture")}` : "Keep This Picture"}
                    icon={Icon.Pin}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                    onAction={() => keep(picked.length ? picked : [picture], true)}
                  />
                )}
                <Action
                  title={picked.length ? `Remove ${plural(picked.length, "Chosen Picture")}…` : "Remove This Picture…"}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(picked.length ? picked : [picture])}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
