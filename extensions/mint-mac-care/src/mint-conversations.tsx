import { Action, ActionPanel, Icon, Keyboard, List, Toast, environment, showToast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { useState } from "react";
import { formatCompact, openMint, plural, shortPath } from "./mint-cli";
import { MissingMint } from "./missing-mint";
import { NeedsNewerMint, chosenAccessory, runConfirmedInMint, useChosen } from "./confirm-in-mint";
import {
  NATIVE_APPROVAL_CAPABILITY,
  PICTURES_PER_REQUEST,
  conversationReceipt,
  conversationRows,
  hasCapability,
  pictureRows,
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

/**
 * The conversations AI tools keep, as Mint's Disk page lists them: Codex's,
 * family by family (a conversation and its linked copies go together), and
 * Claude Code's transcripts that hold pictures. Optimize, remove pictures or
 * delete; every change is confirmed in Mint's own window. Archived Codex
 * conversations Mint can store smaller are found on request (a full Scan).
 */
function Conversations({ cli }: { cli: string }) {
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
      { done: (result) => conversationReceipt(verb, result), failed: "Mint could not change these conversations" },
    );
    lookAgain();
  }

  async function onTranscripts(rows: Transcript[]) {
    if (!claude.data || rows.length === 0) return;
    await runConfirmedInMint<TranscriptResult>(
      cli,
      { action: "disk.compress", sessionID: claude.data.sessionID, itemIDs: rows.map((row) => row.id) },
      { done: transcriptReceipt, failed: "Mint could not remove these pictures" },
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
      },
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
      navigationTitle="AI Conversations"
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
                      shortcut={Keyboard.Shortcut.Common.OpenWith}
                      onAction={() => onFamilies("agents.optimize", rows)}
                    />
                  ) : null}
                  <Action
                    title={`Remove Pictures${many ? ` from${many}` : ""}…`}
                    icon={Icon.EyeDisabled}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
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
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
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
            <List.Item icon={Icon.Warning} title="Mint could not look" subtitle={archives.error.message} />
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
                    <Action
                      title={rows.length > 1 ? `Optimize ${plural(rows.length, "Archive")}…` : "Optimize Archive…"}
                      icon={Icon.Stars}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
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
 * only the ticked ones (unticked ones are kept, as the app's drawer does).
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
      const folder = join(environment.supportPath, "pictures");
      mkdirSync(folder, { recursive: true });
      const file = join(folder, `${id.replace(/[^A-Za-z0-9]/g, "")}.png`);
      writeFileSync(file, Buffer.from(answer.previewImage.data, "base64"));
      return file;
    },
    [cli, review?.sessionID ?? "", selected ?? ""],
    { execute: Boolean(review?.sessionID && selected) },
  );

  async function keep(pictures: Picture[], kept: boolean) {
    if (!review || pictures.length === 0) return;
    const request = {
      action: "pictures.keep",
      sessionID: review.sessionID,
      itemIDs: pictures.slice(0, PICTURES_PER_REQUEST).map((picture) => picture.id),
      kept,
    };
    let result: PictureResult | undefined;
    if (kept) {
      // Keeping only spares pictures: Mint saves it without its window, as in MCP.
      try {
        result = await runParity<PictureResult>(cli, { ...request, confirmed: true });
        await showToast({ style: Toast.Style.Success, title: `Keeping ${plural(pictures.length, "picture")}` });
      } catch (keepError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Mint could not save the Keep choice",
          message: keepError instanceof Error ? keepError.message : String(keepError),
        });
      }
    } else {
      result = await runConfirmedInMint<PictureResult>(cli, request, {
        done: () => `${plural(pictures.length, "picture")} no longer kept`,
        failed: "Mint could not save the Keep choice",
      });
    }
    clear();
    if (result?.review) setReview(result.review);
    else scan.revalidate();
  }

  async function remove(pictures: Picture[]) {
    if (!review || pictures.length === 0) return;
    const result = await runConfirmedInMint<PictureResult>(
      cli,
      {
        action: "pictures.remove",
        sessionID: review.sessionID,
        itemIDs: pictures.slice(0, PICTURES_PER_REQUEST).map((p) => p.id),
      },
      {
        done: (answer) =>
          `${plural(pictures.length, "picture")} removed · ${formatCompact(answer.physicallyReclaimedBytes ?? answer.savedBytes ?? 0)} freed`,
        failed: "Mint could not remove these pictures",
      },
    );
    clear();
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
      searchBarPlaceholder={review ? plural(rows.length, "picture") : "Reading the pictures…"}
    >
      {scan.error ? (
        <List.EmptyView icon={Icon.Warning} title="Mint could not read the pictures" description={scan.error.message} />
      ) : null}
      {rows.map((picture) => {
        const isChosen = chosen.has(picture.id);
        const markdown =
          selected === picture.id && preview.data
            ? `![](${encodeURI(`file://${preview.data}`)}?raycast-height=350)`
            : "";
        return (
          <List.Item
            key={picture.id}
            id={picture.id}
            icon={picture.kept ? Icon.Pin : Icon.Image}
            title={picture.kept ? "Kept" : formatCompact(picture.estimatedSavingBytes)}
            subtitle={picture.copies > 1 ? `${picture.copies} copies` : undefined}
            accessories={[chosenAccessory(isChosen)]}
            detail={<List.Item.Detail markdown={markdown} />}
            actions={
              <ActionPanel>
                <Action
                  title={isChosen ? "Unchoose" : "Choose"}
                  icon={isChosen ? Icon.Circle : Icon.CheckCircle}
                  onAction={() => toggle(picture.id)}
                />
                <Action
                  title={picked.length ? `Remove ${plural(picked.length, "Chosen Picture")}…` : "Remove This Picture…"}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={() => remove(picked.length ? picked : [picture])}
                />
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
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
