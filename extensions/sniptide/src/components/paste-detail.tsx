import { ActionPanel, Detail } from "@raycast/api"
import { usePromise } from "@raycast/utils"
import type { PasteSummary } from "@sniptide/sdk"
import { client } from "../api"
import type { CodeAction } from "../deliver"
import { describe } from "../lib/errors"
import { pasteMarkdown, visibilityLabel } from "../lib/format"
import { messages } from "../lib/messages"
import { report } from "../report"
import { CodeActions, LinkActions } from "./paste-actions"

// A paste's code with its details beside it.
export function PasteDetail({ summary, first }: { summary: PasteSummary; first: CodeAction }) {
  const { data, isLoading, error } = usePromise(
    async (id: string) => (await client().readPaste(id)).paste,
    [summary.id],
    { onError: (failure) => report(failure, messages.failed) },
  )
  const paste = data ?? summary

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={paste.title}
      markdown={data ? pasteMarkdown(data) : error ? describe(error).message : ""}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title={messages.visibilityLabel}
            text={visibilityLabel(paste.visibility)}
          />
          {paste.collection ? (
            <Detail.Metadata.Label title={messages.collectionLabel} text={paste.collection} />
          ) : null}
          {paste.tags.length > 0 ? (
            <Detail.Metadata.TagList title={messages.tagsLabel}>
              {paste.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Label
            title={messages.updatedLabel}
            text={new Date(paste.updatedAt).toLocaleString()}
          />
          <Detail.Metadata.Link title={messages.linkLabel} target={paste.url} text={paste.slug} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <CodeActions paste={paste} first={first} />
          <LinkActions paste={paste} />
        </ActionPanel>
      }
    />
  )
}
