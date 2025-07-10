import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import React from "react";
import { Deal } from "../utils/types";
import { MAX_DESCRIPTION_LENGTH } from "../utils/constants";
import { timeAgo } from "../utils/helpers";

export function DealDetail({ deal }: { deal: Deal }) {
  // Construct the Markdown content for the Detail view
  const markdownContent = `
  ${deal.imageUrl ? `![Deal Image](${deal.imageUrl})\n\n` : ""}
  # ${deal.title.split(" @ ")[0]}
  
  *   **Store:** ${deal.store}
  *   **Posted:** ${timeAgo(deal.pubDate)} by ${deal.creator}
  *   **Votes:** 👍 ${deal.upvotes} | 👎 ${deal.downvotes} (**${deal.netVotes} Net**)
  *   **Comments:** ${deal.comments ?? 0}
  *   **Categories:** ${deal.categories && deal.categories.length > 0 ? deal.categories.join(", ") : "N/A"}
  
  ---
  
  ${deal.descriptionMarkdown.substring(0, MAX_DESCRIPTION_LENGTH)}
  ${deal.descriptionMarkdown.length > MAX_DESCRIPTION_LENGTH ? "\n\n... (Description Truncated)" : ""}
    `;

  return (
    <Detail
      navigationTitle={deal.title} // Title shown in the navigation bar
      markdown={markdownContent}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={deal.link} title="Open Deal in Browser" />
          <Action.CopyToClipboard content={deal.link} title="Copy Deal Link" />
          <Action.CopyToClipboard content={deal.title} title="Copy Deal Title" />
          <Action.OpenInBrowser
            url={`${deal.link}#comments`}
            title="Open Comments in Browser"
            icon={Icon.SpeechBubble}
          />
          {deal.imageUrl && (
            <Action.OpenInBrowser url={deal.imageUrl} title="View Image in Browser" icon={Icon.Image} />
          )}
        </ActionPanel>
      }
      // Metadata section provides structured information
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Store" text={deal.store} icon={Icon.Tag} />
          <Detail.Metadata.Label title="Posted By" text={deal.creator} icon={Icon.Person} />
          <Detail.Metadata.Label title="Posted At" text={deal.pubDate.toLocaleString()} icon={Icon.Calendar} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Upvotes" text={deal.upvotes.toString()} icon={Icon.ArrowUp} />
          <Detail.Metadata.Label title="Downvotes" text={deal.downvotes.toString()} icon={Icon.ArrowDown} />
          <Detail.Metadata.Label title="Net Votes" text={deal.netVotes.toString()} icon={Icon.Gauge} />
          <Detail.Metadata.Label title="Comments" text={deal.comments.toString()} icon={Icon.SpeechBubble} />
          {deal.categories && deal.categories.length > 0 && (
            <Detail.Metadata.TagList title="Categories">
              {deal.categories.map((cat) => (
                <Detail.Metadata.TagList.Item key={cat} text={cat} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Original Link" target={deal.link} text="View on OzBargain" />
        </Detail.Metadata>
      }
    />
  );
}
