import { ActionPanel, List, Action, Icon, useNavigation, Detail, Toast } from "@raycast/api";
import { useState, useRef, useEffect, Fragment } from "react";
import { DateTime } from "luxon";
import { nanoid } from "nanoid";

import { Sourcegraph, instanceName } from "../sourcegraph";
import { findNotebooks, SearchNotebook } from "../sourcegraph/gql";
import checkAuthEffect from "../hooks/checkAuthEffect";
import { copyShortcut, secondaryActionShortcut } from "./shortcuts";
import { ColorDefault, ColorEmphasis, ColorPrivate } from "./colors";

export default function FindNotebooksCommand(src: Sourcegraph) {
  const { state, find } = useNotebooks(src);
  const srcName = instanceName(src);
  const nav = useNavigation();

  useEffect(checkAuthEffect(src, nav));

  const showStarred = src.token && !state.searchText;
  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={find}
      searchBarPlaceholder={`Find search notebooks on ${srcName}`}
      selectedItemId={state.notebooks?.length > 0 ? "first-result" : undefined}
      throttle
    >
      {!state.isLoading && !state.searchText ? (
        <List.Section title={"Suggestions"}>
          <List.Item
            title="Create a search notebook"
            icon={{ source: Icon.Plus }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Create in Browser" url={`${src.instance}/notebooks/new`} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : (
        <Fragment />
      )}

      <List.Section
        title={showStarred ? "Starred" : "Notebooks"}
        subtitle={`${state.notebooks.length} ${showStarred ? "notebooks" : "results"}`}
      >
        {state.notebooks.map((n, i) => (
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
  const author = notebook.creator.displayName || notebook.creator.username;
  const url = `${src.instance}/notebooks/${notebook.id}`;
  return (
    <List.Item
      id={id}
      title={notebook.title}
      subtitle={updated ? `${author}, updated ${updated}` : author}
      accessoryTitle={stars ? `${stars}` : ""}
      accessoryIcon={
        notebook.stars?.totalCount
          ? {
              source: Icon.Star,
              tintColor: notebook.viewerHasStarred ? ColorEmphasis : undefined,
            }
          : undefined
      }
      icon={{
        source: Icon.Document,
        tintColor: notebook.public ? ColorDefault : ColorPrivate,
      }}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser key={nanoid()} url={url} />
          <Action.Push
            key={nanoid()}
            title="Peek Search Notebook"
            icon={{ source: Icon.MagnifyingGlass }}
            target={<NotebookPeek notebook={notebook} src={src} />}
            shortcut={secondaryActionShortcut}
          />
          <Action.CopyToClipboard
            key={nanoid()}
            title="Copy Search Notebook URL"
            content={url}
            shortcut={copyShortcut}
          />
        </ActionPanel>
      }
    />
  );
}

function NotebookPeek({ notebook, src }: { notebook: SearchNotebook; src: Sourcegraph }) {
  const author = notebook.creator.displayName
    ? `${notebook.creator.displayName} (@${notebook.creator.username})`
    : `@${notebook.creator.username}`;
  let blurb = `Created by ${author}`;
  try {
    blurb += ` ${DateTime.fromISO(notebook.createdAt).toRelative()}, last updated ${DateTime.fromISO(
      notebook.updatedAt
    ).toRelative()}`;
  } catch (e) {
    console.warn(`notebook ${notebook.id}: invalid date: ${e}`);
  }
  const preview = `**${notebook.title}** ${notebook.stars?.totalCount ? `- ${notebook.stars.totalCount} ★` : ""}

> ${blurb}

---

${
  notebook.blocks
    ? notebook.blocks
        .map((b) => {
          let str = "";
          if (b.markdownInput) {
            str += `${b.markdownInput}`;
          } else if (b.queryInput) {
            str += `\`\`\`\n${b.queryInput}\n\`\`\``;
          } else if (b.fileInput) {
            str += `\`\`\`\n${b.fileInput.repositoryName} > ${b.fileInput.filePath}\n\`\`\``;
          } else {
            str += `\`\`\`\n${b}\n\`\`\``;
          }
          return str;
        })
        .join("\n\n")
    : ""
}`;

  const notebookURL = `${src.instance}/notebooks/${notebook.id}`;
  return (
    <Detail
      markdown={preview}
      navigationTitle={"Peek Search Notebook"}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={notebookURL} />
          <Action.CopyToClipboard title="Copy Link to Notebook" content={notebookURL} />
        </ActionPanel>
      }
    />
  );
}

interface NotebooksState {
  searchText: string;
  notebooks: SearchNotebook[];
  isLoading: boolean;
}

function useNotebooks(src: Sourcegraph) {
  const [state, setState] = useState<NotebooksState>({
    searchText: "",
    notebooks: [],
    isLoading: true,
  });
  const cancelRef = useRef<AbortController | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    find(); // initial load
  }, []);

  async function find(searchText?: string) {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();

    try {
      setState((oldState) => ({
        ...oldState,
        searchText: searchText || "",
        notebooks: [],
        isLoading: true,
      }));

      const resp = await findNotebooks(cancelRef.current.signal, src, searchText);
      setState((oldState) => ({
        ...oldState,
        notebooks: resp?.notebooks?.nodes || [],
        isLoading: false,
      }));
    } catch (error) {
      new Toast({
        style: Toast.Style.Failure,
        title: "Find notebooks failed",
        message: String(error),
        primaryAction: {
          title: "View details",
          onAction: () => {
            push(
              <Detail markdown={`**Find notebooks failed:** ${String(error)}`} navigationTitle="Unexpected error" />
            );
          },
        },
      }).show();

      setState((oldState) => ({
        ...oldState,
        isLoading: false,
      }));
    }
  }

  return { state, find };
}
