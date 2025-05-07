import { ActionPanel, List, Action, Icon, Detail, useNavigation } from "@raycast/api";
import { useState, Fragment, useMemo, useEffect } from "react";
import { DateTime } from "luxon";
import { nanoid } from "nanoid";

import { Sourcegraph, instanceName, LinkBuilder } from "../sourcegraph";
import {
  useGetNotebooksQuery,
  NotebooksOrderBy,
  SearchNotebookFragment as SearchNotebook,
} from "../sourcegraph/gql/operations";
import { bold, codeBlock, italic, quoteBlock } from "../markdown";

import { copyShortcut } from "./shortcuts";
import { ColorDefault, ColorEmphasis, ColorPrivate } from "./colors";
import ExpandableToast from "./ExpandableToast";
import { useTelemetry } from "../hooks/telemetry";

const link = new LinkBuilder("notebooks");

/**
 * FindNotebooksCommand is the shared search notebooks command.
 */
export default function FindNotebooksCommand({ src }: { src: Sourcegraph }) {
  const { recorder } = useTelemetry(src);
  useEffect(() => recorder.recordEvent("findNotebooks", "start"), []);

  const [searchText, setSearchText] = useState("");
  const { loading, error, data } = useGetNotebooksQuery({
    client: src.client,
    variables: {
      query: searchText,
      orderBy: searchText ? NotebooksOrderBy.NotebookStarCount : NotebooksOrderBy.NotebookUpdatedAt,
    },
  });
  const notebooks = useMemo(() => data?.notebooks.nodes, [data]);

  const { push } = useNavigation();
  if (error) {
    ExpandableToast(push, "Unexpected error", "Find notebooks failed", error.message).show();
  }

  const srcName = instanceName(src);
  const length = notebooks?.length || 0;
  return (
    <List
      isLoading={loading}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder={`Find search notebooks on ${srcName}`}
      selectedItemId={length > 0 ? "first-result" : undefined}
      throttle
    >
      {!loading && !searchText && (
        <List.Section title={"Suggestions"}>
          <List.Item
            title="Create a search notebook"
            icon={{ source: Icon.NewDocument }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Create in Browser" url={link.new(src, `/notebooks/new`)} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {loading && length === 0 && <List.EmptyView title={"Loading..."} />}

      <List.Section title={searchText ? "Notebooks" : "Recent notebooks"}>
        {notebooks?.map((n, i) => (
          <NotebookResultItem id={i === 0 ? "first-result" : undefined} key={nanoid()} notebook={n} src={src} />
        ))}
      </List.Section>
    </List>
  );
}

function NotebookResultItem({
  id,
  notebook,
  src,
}: {
  id: string | undefined;
  notebook: SearchNotebook;
  src: Sourcegraph;
}) {
  let updated: string | null = null;
  try {
    const d = DateTime.fromISO(notebook.updatedAt);
    updated = d.toRelative();
  } catch (e) {
    console.warn(`notebook ${notebook.id}: invalid date: ${e}`);
  }
  const stars = notebook.stars?.totalCount || 0;
  const author = notebook.creator?.displayName || notebook.creator?.username || "";
  const url = link.new(src, `/notebooks/${notebook.id}`);
  const accessories: List.Item.Accessory[] = [];
  if (stars) {
    accessories.push({
      text: `${stars}`,
      icon: {
        source: Icon.Star,
        tintColor: notebook.viewerHasStarred ? ColorEmphasis : undefined,
      },
      tooltip: notebook.viewerHasStarred ? "Starred by you" : `${stars} stars`,
    });
  }
  return (
    <List.Item
      id={id}
      title={notebook.title}
      subtitle={updated ? `by ${author}, updated ${updated}` : author}
      accessories={accessories}
      icon={{
        value: {
          source: Icon.CodeBlock,
          tintColor: notebook.public ? ColorDefault : ColorPrivate,
        },
        tooltip: notebook.public ? "Public notebook" : "Private notebook",
      }}
      actions={
        <ActionPanel>
          <Action.Push
            key={nanoid()}
            title="Preview Notebook"
            icon={{ source: Icon.Maximize }}
            target={<NotebookPreviewView notebook={notebook} src={src} />}
          />
          <Action.OpenInBrowser key={nanoid()} url={url} />
          <Action.CopyToClipboard key={nanoid()} title="Copy Notebook URL" content={url} shortcut={copyShortcut} />
        </ActionPanel>
      }
    />
  );
}

function NotebookPreviewView({ notebook, src }: { notebook: SearchNotebook; src: Sourcegraph }) {
  const author = notebook.creator?.displayName
    ? `${notebook.creator.displayName} (@${notebook.creator.username})`
    : `@${notebook.creator?.username}`;
  const preview = `${bold(notebook.title)}

${
  notebook.blocks
    ? notebook.blocks
        .map((b): string => {
          switch (b.__typename) {
            case "MarkdownBlock":
              return b.markdownInput;
            case "QueryBlock":
              return codeBlock(b.queryInput);
            case "FileBlock":
              return codeBlock(`${b.fileInput.repositoryName} > ${b.fileInput.filePath}`);
            case "SymbolBlock": {
              const symbol = quoteBlock(
                `${italic(b.symbolInput.symbolKind.toLocaleLowerCase())} ${bold(b.symbolInput.symbolName)} ${
                  b.symbolInput.symbolContainerName
                }`,
              );
              return `${symbol}\n${codeBlock(`${b.symbolInput.repositoryName} > ${b.symbolInput.filePath}`)}`;
            }
          }
        })
        .join("\n\n")
    : ""
}`;

  const notebookURL = link.new(src, `/notebooks/${notebook.id}`);
  const namespaceIsCreator = notebook.namespace?.namespaceName == notebook.creator?.username;
  return (
    <Detail
      markdown={preview}
      navigationTitle={"Preview Search Notebook"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Author" text={author} target={link.new(src, notebook.creator?.url || "")} />
          {notebook.namespace && !namespaceIsCreator ? (
            <Detail.Metadata.Link
              title="Owned by"
              text={notebook.namespace.namespaceName}
              target={link.new(src, notebook.namespace.url)}
            />
          ) : (
            <Fragment />
          )}
          <Detail.Metadata.Label title="Visibility" text={notebook.public ? "Public" : "Private"} />
          {notebook.stars.totalCount ? (
            <Detail.Metadata.Label title="Stars" text={`${notebook.stars.totalCount}`} />
          ) : (
            <Fragment />
          )}
          <Detail.Metadata.Label
            title="Updated"
            text={DateTime.fromISO(notebook.updatedAt).toRelative() || "Unknown"}
          />
          <Detail.Metadata.Label
            title="Created"
            text={DateTime.fromISO(notebook.createdAt).toRelative() || "Unknown"}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={notebookURL} />
          <Action.CopyToClipboard title="Copy Link to Notebook" content={notebookURL} />
        </ActionPanel>
      }
    />
  );
}
