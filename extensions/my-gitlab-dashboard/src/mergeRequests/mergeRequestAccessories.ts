import { Color, Icon, getPreferenceValues } from "@raycast/api";
import { Comment, MergeRequest } from "../gitlab/mergeRequest";
import { User } from "../gitlab/user";
import { relativeDateAccessory } from "../utils";

interface Preferences {
  colorizedDatesForMergeRequests?: boolean;
}
const preferences = getPreferenceValues<Preferences>();

export const mergeRequestAccessoryFactories = {
  hasUpdates: (mr: MergeRequest) => {
    if (mr.hasUpdates) {
      return {
        icon: { source: Icon.Stars, tintColor: Color.Orange },
        tooltip: "Updated since last viewed",
      };
    }
  },

  conflicts: (mr: MergeRequest) => {
    if (mr.hasConflicts) {
      return {
        icon: { source: Icon.WrenchScrewdriver, tintColor: Color.Red },
        tooltip: "MR has conflicts",
      };
    }
  },

  draft: (mr: MergeRequest) => {
    if (mr.draft) {
      return { icon: Icon.Brush, tooltip: "MR in draft" };
    }
  },

  comments: (mr: MergeRequest) => {
    if (mr.state === "merged" || (mr.unresolvedCommentsCount == 0 && mr.comments.length == 0)) {
      return;
    }

    function uniqueUsersThatCommented(comments: Comment[]): User[] {
      const uniqueCommentsByUsername = [...new Map(comments.map((c) => [c.author.username, c])).values()];
      return [...uniqueCommentsByUsername].map((c) => c.author);
    }
    function commentsAccessory(commentsType: string, icon: Icon, commentFilter?: (c: Comment) => boolean) {
      const filteredComments = mr.comments.filter((c) => commentFilter?.(c) ?? true);
      const uniqueUsers = uniqueUsersThatCommented(filteredComments);
      const commentedByMe = uniqueUsers.some((u) => u.isMe);
      return {
        text: { value: `${filteredComments.length}`, color: commentedByMe ? Color.Yellow : undefined },
        icon: { source: icon, tintColor: commentedByMe ? Color.Yellow : undefined },
        tooltip: `${commentsType} by ${uniqueUsers.map((u) => u.teamUsername).join(", ")}`,
      };
    }
    return mr.unresolvedCommentsCount > 0
      ? commentsAccessory("Unresolved comments", Icon.SpeechBubbleImportant, (c) => c.isUnresolved)
      : commentsAccessory("Comments", Icon.SpeechBubble);
  },

  approvers: (mr: MergeRequest) => {
    if (mr.state !== "merged" && mr.hasApprovers) {
      return {
        text: mr.approvedBy.length > 1 ? `${mr.approvedBy.length}` : undefined,
        icon: { source: "../assets/approved.png", tintColor: Color.Green },
        tooltip: `Approved by ${mr.approvedBy.map((u) => u.teamUsername).join(", ")}`,
      };
    }
  },

  pipeline: (mr: MergeRequest) => {
    switch (mr.latestPipeline?.status) {
      case "failed": {
        const firstFailedJob = mr.latestPipeline?.failedJobs[0];
        return {
          icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
          tooltip: `Pipeline failed at ${firstFailedJob.stage}:${firstFailedJob.name}`,
        };
      }
      case "running": {
        const firstRunningJob = mr.latestPipeline?.runningJobs[0];
        return {
          icon: { source: Icon.CircleProgress25, tintColor: Color.Blue },
          tooltip: mr.latestPipeline?.hasRunningJobs
            ? `Pipeline is running ${firstRunningJob.stage}:${firstRunningJob.name}`
            : "Pipeline is running",
        };
      }
    }
  },

  createdBy: (mr: MergeRequest) => {
    return {
      text: { value: mr.author.teamUsername, color: mr.author.isMe ? Color.Yellow : undefined },
      icon: mr.author.isMe ? { source: Icon.Bolt, tintColor: Color.Yellow } : Icon.Person,
      tooltip: `Created by ${mr.author.teamUsername}`,
    };
  },

  mergedBy: (mr: MergeRequest) => {
    if (mr.mergedBy && mr.author.username != mr.mergedBy!.username) {
      return {
        text: mr.mergedBy!.teamUsername,
        icon: { source: "../assets/merged.png", tintColor: Color.Magenta },
        tooltip: `Merged by ${mr.mergedBy!.teamUsername}`,
      };
    }
  },

  createdAt: (mr: MergeRequest) => {
    if (mr.state !== "merged") {
      return relativeDateAccessory(mr.createdAt, "Created", preferences.colorizedDatesForMergeRequests);
    }
  },
};
