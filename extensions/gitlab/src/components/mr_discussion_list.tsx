import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  Form,
  Icon,
  Image,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { MRDiscussion, MRDiscussionNote, MergeRequest } from "../gitlabapi";
import { formatDate, optimizeMarkdownText, shortify } from "../utils";
import { GitLabOpenInBrowserAction } from "./actions";
import { isDiscussionResolved } from "./mr_discussions";
import {
  createMRDiscussionNoteGql,
  fetchMRDiscussionDiffGql,
  fetchMRDiscussionsGqlPage,
  resolveAvatarUrl,
  toggleMRDiscussionResolveGql,
} from "./mr_discussions_gql";

function discussionMarkdown(
  notes: MRDiscussionNote[],
  mergeRequest: MergeRequest,
  diff: string | undefined,
  isLoadingDiff?: boolean,
): string {
  const blocks: string[] = [];
  const firstNote = notes[0];
  if (firstNote?.position?.file_path) {
    const label = firstNote.position.line
      ? `${firstNote.position.file_path}:${firstNote.position.line}`
      : firstNote.position.file_path;
    blocks.push(`[${label}](${firstNote.web_url || mergeRequest.web_url})`);
  }
  if (diff) {
    blocks.push(["```diff", diff, "```"].join("\n"));
  } else if (isLoadingDiff) {
    blocks.push("_Loading diff..._");
  } else if (firstNote?.position) {
    blocks.push("_Diff is unavailable for this position._");
  }
  blocks.push(
    notes
      .map((note) => {
        const authorName = note.author?.name ?? "Unknown";
        const avatarUrl = resolveAvatarUrl(note.author?.avatar_url);
        let avatar: string | undefined;
        if (avatarUrl) {
          const url = new URL(avatarUrl);
          url.searchParams.set("raycast-width", "20");
          url.searchParams.set("raycast-height", "20");
          avatar = `\u200B![](${url.href}) `;
        }
        return `${avatar ?? ""}**${authorName}** • ${formatDate(note.created_at)}:  \n${optimizeMarkdownText(note.body, mergeRequest.project_web_url, mergeRequest.project_id)}`;
      })
      .join("\n\n---\n\n"),
  );
  return blocks.join("\n\n");
}

function MRDiscussionReplyForm(props: { mr: MergeRequest; discussion: MRDiscussion; onRevalidate: () => void }) {
  const { pop } = useNavigation();

  async function submit(values: { body: string }) {
    if (!values.body.trim()) {
      throw Error("Please enter a reply");
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding reply..." });
      if (!props.mr.gql_id) {
        throw Error("Merge request ID is missing");
      }
      await createMRDiscussionNoteGql({
        noteableId: props.mr.gql_id,
        discussionId: props.discussion.id,
        body: values.body,
      });
      showToast(Toast.Style.Success, "Reply added");
      props.onRevalidate();
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to add reply" });
    }
  }

  return (
    <Form
      navigationTitle="Reply to Discussion"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Reply" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="body" title="Reply" placeholder="Enter reply" enableMarkdown />
    </Form>
  );
}

function MRDiscussionListItem(props: {
  mr: MergeRequest;
  discussion: MRDiscussion;
  isFocused: boolean;
  onRevalidate: () => void;
}) {
  const notes = useMemo(() => (props.discussion.notes ?? []).filter((note) => !note.system), [props.discussion.notes]);
  const firstNote = notes[0];
  const position = firstNote?.position;
  const { data: diff, isLoading: isLoadingDiff } = useCachedPromise(
    async (projectFullPath: string, notePosition: MRDiscussionNote["position"]) => {
      if (!notePosition) {
        return undefined;
      }
      return fetchMRDiscussionDiffGql({ projectFullPath, position: notePosition });
    },
    [props.mr.project_full_path, position],
    {
      execute: props.isFocused && position?.head_sha !== undefined,
    },
  );
  const isResolved = isDiscussionResolved(props.discussion);
  const titleBody = firstNote?.body.replace(/\s+/g, " ").trim() || "Discussion";
  const detailMarkdown = useMemo(
    () => discussionMarkdown(notes, props.mr, diff, isLoadingDiff),
    [diff, isLoadingDiff, notes, props.mr],
  );

  async function toggleResolved() {
    if (
      !(await confirmAlert({
        title: isResolved ? "Reopen thread?" : "Resolve thread?",
        message: `${isResolved ? "Reopen" : "Resolve"} this discussion in !${props.mr.iid}?`,
        primaryAction: {
          title: isResolved ? "Reopen thread" : "Resolve thread",
        },
      }))
    ) {
      return;
    }
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: isResolved ? "Reopening thread..." : "Resolving thread...",
      });
      await toggleMRDiscussionResolveGql({ discussionId: props.discussion.id, resolve: !isResolved });
      showToast(Toast.Style.Success, isResolved ? "Thread reopened" : "Thread resolved");
      props.onRevalidate();
    } catch (error) {
      showFailureToast(error, {
        title: isResolved ? "Failed to reopen thread" : "Failed to resolve thread",
      });
    }
  }

  return (
    <List.Item
      id={props.discussion.id}
      title={shortify(titleBody.replace(/\\(.)/g, "$1"), 100)}
      icon={{
        value: {
          source: resolveAvatarUrl(firstNote?.author?.avatar_url) || Icon.SpeechBubble,
          mask: Image.Mask.Circle,
        },
        tooltip: firstNote?.author?.name ?? "",
      }}
      accessories={
        isResolved ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Resolved" }] : []
      }
      detail={<List.Item.Detail markdown={detailMarkdown} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Reply"
              icon={{ source: Icon.Message, tintColor: Color.PrimaryText }}
              target={
                <MRDiscussionReplyForm mr={props.mr} discussion={props.discussion} onRevalidate={props.onRevalidate} />
              }
            />
            <GitLabOpenInBrowserAction url={firstNote?.web_url || props.mr.web_url} />
            {props.discussion.resolvable && (
              <Action
                title={isResolved ? "Reopen Thread" : "Resolve Thread"}
                icon={{
                  source: isResolved ? Icon.RotateAntiClockwise : Icon.Checkmark,
                  tintColor: isResolved ? Color.Red : Color.Green,
                }}
                onAction={toggleResolved}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function MRDiscussionList(props: { mr: MergeRequest }) {
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string>();
  const {
    data: discussions,
    isLoading,
    revalidate,
    pagination,
  } = useCachedPromise(
    (projectFullPath: string, mrIID: number) => async (options: { page: number }) => {
      const { discussions, hasMore } = await fetchMRDiscussionsGqlPage({
        cacheKey: `mr_discussions_${projectFullPath}_${mrIID}`,
        page: options.page,
        projectFullPath,
        mrIID,
      });
      return { data: discussions, hasMore };
    },
    [props.mr.project_full_path, props.mr.iid],
    {
      initialData: [],
    },
  );
  useEffect(() => {
    if (!selectedDiscussionId && discussions[0]) {
      setSelectedDiscussionId(discussions[0].id);
    }
  }, [discussions, selectedDiscussionId]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      selectedItemId={selectedDiscussionId}
      onSelectionChange={(id) => setSelectedDiscussionId(id ?? undefined)}
      pagination={pagination}
      navigationTitle={`Discussions ${props.mr.reference_full}`}
    >
      {discussions.map((discussion) => (
        <MRDiscussionListItem
          key={discussion.id}
          mr={props.mr}
          discussion={discussion}
          isFocused={discussion.id === selectedDiscussionId}
          onRevalidate={revalidate}
        />
      ))}
      <List.EmptyView title="No Discussions" />
    </List>
  );
}
