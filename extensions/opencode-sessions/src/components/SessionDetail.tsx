import { Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";

import { loadTranscript } from "../lib/storage";
import { Project, Session, TranscriptEntry } from "../types";
import { buildTranscriptMarkdown, formatCost, formatDate, formatTokens, repoName } from "../utils";
import { SessionActions } from "./SessionActions";

interface SessionDetailProps {
  session: Session;
  project: Project | undefined;
  mutate: () => Promise<void>;
}

function computeStats(entries: TranscriptEntry[]) {
  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let lastModel: string | undefined;
  let lastProvider: string | undefined;
  let messageCount = 0;

  for (const { message } of entries) {
    messageCount++;

    if (message.role === "assistant") {
      if (message.cost) {
        totalCost += message.cost;
      }

      if (message.tokens) {
        totalInputTokens += message.tokens.input + message.tokens.cache.read;
        totalOutputTokens += message.tokens.output;
      }

      if (message.modelID) {
        lastModel = message.modelID;
      }

      if (message.providerID) {
        lastProvider = message.providerID;
      }
    }
  }

  return { totalCost, totalInputTokens, totalOutputTokens, lastModel, lastProvider, messageCount };
}

export function SessionDetail({ session, project, mutate }: SessionDetailProps) {
  const abortable = useRef<AbortController>(null);
  const { data, isLoading } = usePromise((sid) => loadTranscript(sid), [session.id], {
    abortable,
  });

  const entries = data ?? [];
  const stats = computeStats(entries);
  const markdown = isLoading ? "Loading transcript..." : buildTranscriptMarkdown(entries);
  const repo = project ? repoName(project.worktree) : undefined;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={session.title || session.slug}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={session.title || session.slug} />
          <Detail.Metadata.Label title="Session ID" text={session.id} icon={Icon.Fingerprint} />
          <Detail.Metadata.Label title="Slug" text={session.slug} icon={Icon.Tag} />

          <Detail.Metadata.Separator />

          {repo && <Detail.Metadata.Label title="Project" text={repo} icon={Icon.Folder} />}
          <Detail.Metadata.Label title="Directory" text={session.directory} icon={Icon.Folder} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="First Message" text={formatDate(session.time.created)} icon={Icon.Calendar} />
          <Detail.Metadata.Label title="Last Message" text={formatDate(session.time.updated)} icon={Icon.Clock} />
          {stats.messageCount > 0 && (
            <Detail.Metadata.Label title="Total Messages" text={String(stats.messageCount)} icon={Icon.Bubble} />
          )}

          <Detail.Metadata.Separator />

          {stats.lastModel && (
            <Detail.Metadata.Label
              title="Model"
              text={`${stats.lastProvider ? stats.lastProvider + "/" : ""}${stats.lastModel}`}
              icon={Icon.ComputerChip}
            />
          )}
          {stats.totalCost > 0 && (
            <Detail.Metadata.Label title="Cost" text={formatCost(stats.totalCost)} icon={Icon.Coins} />
          )}
          {(stats.totalInputTokens > 0 || stats.totalOutputTokens > 0) && (
            <Detail.Metadata.Label
              title="Tokens"
              text={`${formatTokens(stats.totalInputTokens)} in / ${formatTokens(stats.totalOutputTokens)} out`}
              icon={Icon.BarChart}
            />
          )}

          {session.summary && session.summary.files > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Files Changed"
                text={`${session.summary.files} files (+${session.summary.additions} -${session.summary.deletions})`}
                icon={Icon.Document}
              />
            </>
          )}

          {session.share?.url && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Link title="Share URL" target={session.share.url} text="Open Share Link" />
            </>
          )}
        </Detail.Metadata>
      }
      actions={<SessionActions session={session} project={project} mutate={mutate} isDetail />}
    />
  );
}
