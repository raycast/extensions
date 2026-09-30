import React from "react";
import { Action, ActionPanel, Icon, Keyboard, AI, environment, showHUD, Clipboard } from "@raycast/api";
import { DisplayPost } from "../api/types";
import { PostDetailView } from "./PostDetailView";
import { AIPostView } from "./AIPostView";
import { getPostTextContent, getTLDRPrompt } from "../utils/ai-helpers";

interface PostActionsProps {
  readonly post: DisplayPost;
  readonly onToggleDetail?: () => void;
  readonly showDetailToggle?: boolean;
  readonly onToggleMetadata?: () => void;
  readonly showMetadataToggle?: boolean;
  readonly extraActions?: React.ReactNode;
}

export function PostActions({
  post,
  onToggleDetail,
  showDetailToggle = true,
  onToggleMetadata,
  showMetadataToggle = false,
  extraActions,
}: PostActionsProps) {
  const hasAIAccess = environment.canAccess(AI);

  const handleQuickTLDR = async () => {
    if (!hasAIAccess) {
      await showHUD("AI features require Raycast Pro");
      return;
    }

    await showHUD("Generating TLDR...");

    try {
      const postContent = getPostTextContent(post);
      const prompt = getTLDRPrompt(postContent);
      const tldr = await AI.ask(prompt, { creativity: "low" });

      await Clipboard.copy(tldr);
      await showHUD("TLDR copied to clipboard!");
    } catch {
      await showHUD("Failed to generate TLDR");
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {/* Enter - opens fullscreen Detail */}
        <Action.Push
          icon={Icon.Eye}
          title="Open Details"
          target={<PostDetailView post={post} blocks={post.blocks} />}
        />
        {/* Cmd+Enter - opens in browser */}
        <Action.OpenInBrowser
          url={post.url}
          title="Open in Browser"
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "return" },
            Windows: { modifiers: ["ctrl"], key: "return" },
          }}
        />
      </ActionPanel.Section>

      {/* AI Actions */}
      {hasAIAccess && (
        <ActionPanel.Section title="AI">
          <Action.Push
            icon={Icon.Document}
            title="Summarize"
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "s" },
              Windows: { modifiers: ["ctrl"], key: "s" },
            }}
            target={<AIPostView post={post} mode="summarize" />}
          />
          <Action.Push
            icon={Icon.Globe}
            title="Translate to English"
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "t" },
              Windows: { modifiers: ["ctrl"], key: "t" },
            }}
            target={<AIPostView post={post} mode="translate" />}
          />
          <Action.Push
            icon={Icon.BulletPoints}
            title="Extract Key Points"
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "k" },
              Windows: { modifiers: ["ctrl", "shift"], key: "k" },
            }}
            target={<AIPostView post={post} mode="keypoints" />}
          />
          <Action
            icon={Icon.Stars}
            title="Quick TLDR (Copy)"
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "s" },
              Windows: { modifiers: ["ctrl", "shift"], key: "s" },
            }}
            onAction={handleQuickTLDR}
          />
        </ActionPanel.Section>
      )}

      <ActionPanel.Section>
        {showDetailToggle && onToggleDetail && (
          <Action
            icon={Icon.Sidebar}
            title="Toggle Preview"
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "d" },
              Windows: { modifiers: ["ctrl"], key: "d" },
            }}
            onAction={onToggleDetail}
          />
        )}
        {showMetadataToggle && onToggleMetadata && (
          <Action
            icon={Icon.AppWindowList}
            title="Toggle Metadata"
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "m" },
              Windows: { modifiers: ["ctrl"], key: "m" },
            }}
            onAction={onToggleMetadata}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard content={post.url} title="Copy Link" shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.CopyToClipboard content={post.title} title="Copy Title" shortcut={Keyboard.Shortcut.Common.CopyName} />
      </ActionPanel.Section>

      {extraActions && (
        <ActionPanel.Section>
          <>{extraActions}</>
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
