import { Action, Color, Icon, Toast, showToast } from "@raycast/api";
import { MergeRequest, MergeRequestCannotBeMergedError, markAsDraft, markAsReady, merge } from "../gitlab/mergeRequest";
import { MergeRequestComments } from "./MergeRequestComments";

export const mergeRequestActionFactories = {
  browse: {
    openInBrowser: (mr: MergeRequest) => {
      return <Action.OpenInBrowser url={mr.webUrl} title="Open in Browser" />;
    },

    openJira: (mr: MergeRequest) => {
      if (mr.jira !== undefined) {
        return <Action.OpenInBrowser url={mr.jira.url} title="Open Jira" />;
      }
    },

    openPipeline: (mr: MergeRequest) => {
      if (mr.latestPipeline?.hasFailedJobs) {
        return (
          <Action.OpenInBrowser
            url={mr.latestPipeline!.failedJobs[0].web_url}
            icon={{ source: Icon.Globe, tintColor: Color.Red }}
            title="Open Failed Job"
          />
        );
      } else if (mr.latestPipeline !== undefined) {
        return <Action.OpenInBrowser url={mr.latestPipeline.webUrl} title="Open Pipeline" />;
      }
    },
  },

  actions: {
    markAsDraft: (mr: MergeRequest) => {
      if (mr.draft) {
        return (
          <Action
            title="Mark as Ready"
            icon={Icon.CheckRosette}
            onAction={() => markAsReady(mr).then(() => showToast({ title: `MR !${mr.iid} marked as ready` }))}
          />
        );
      } else {
        return (
          <Action
            title="Mark as Draft"
            icon={Icon.Brush}
            onAction={() => markAsDraft(mr).then(() => showToast({ title: `MR !${mr.iid} marked as draft` }))}
          />
        );
      }
    },

    merge: (mr: MergeRequest) => {
      return (
        <Action
          title="Merge"
          icon={{ source: "../assets/merged.png", tintColor: Color.Magenta }}
          onAction={() =>
            merge(mr)
              .then(() => showToast({ title: `MR !${mr.iid} was successfully merged` }))
              .catch((err) => {
                if (err instanceof MergeRequestCannotBeMergedError) {
                  return showToast({
                    title: `MR !${mr.iid} cannot be merged`,
                    message: err.message,
                    style: Toast.Style.Failure,
                  });
                }
              })
          }
        />
      );
    },

    showComments: (mr: MergeRequest) => {
      if (mr.hasComments) {
        return (
          <Action.Push
            title="Show Comments"
            icon={Icon.Bubble}
            target={<MergeRequestComments mrTitle={mr.title} comments={mr.comments} />}
          />
        );
      }
    },
  },

  copy: {
    title: (mr: MergeRequest) => {
      return <Action.CopyToClipboard content={mr.title} title="Copy Title" />;
    },

    sourceBranch: (mr: MergeRequest) => {
      return <Action.CopyToClipboard content={mr.sourceBranch} title="Copy Branch Name" />;
    },

    jiraKey: (mr: MergeRequest) => {
      if (mr.jira) {
        return <Action.CopyToClipboard content={mr.jira.key} title="Copy Jira Key" />;
      }
    },
  },
};
