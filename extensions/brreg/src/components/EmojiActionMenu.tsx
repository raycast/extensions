import { Action, ActionPanel } from "@raycast/api";
import EmojiForm from "./EmojiForm";
import { EMOJI_CATEGORIES } from "../constants";
import React from "react";

interface EmojiActionMenuProps {
  entity: { organisasjonsnummer: string; navn: string };
  currentEmoji?: string;
  onUpdateEmoji: (entity: { organisasjonsnummer: string; navn: string }, emoji?: string) => void;
  onResetToFavicon: (entity: { organisasjonsnummer: string; navn: string }) => void;
  onRefreshFavicon: (entity: { organisasjonsnummer: string; navn: string }) => void;
}

function EmojiActionMenu({
  entity,
  currentEmoji,
  onUpdateEmoji,
  onResetToFavicon,
  onRefreshFavicon,
}: EmojiActionMenuProps) {
  return (
    <>
      <ActionPanel.Submenu title="Set Emoji">
        {EMOJI_CATEGORIES.map(({ emoji, label }) => (
          <Action key={emoji} title={`${emoji} ${label}`} onAction={() => onUpdateEmoji(entity, emoji)} />
        ))}
        <Action title="Clear Emoji (use Favicon)" onAction={() => onResetToFavicon(entity)} />
        <Action.Push
          title="Custom Emoji…"
          target={<EmojiForm initialEmoji={currentEmoji} onSubmit={(e) => onUpdateEmoji(entity, e)} />}
        />
      </ActionPanel.Submenu>
      <Action title="Reset to Favicon" onAction={() => onResetToFavicon(entity)} />
      <Action title="Refresh Favicon" onAction={() => onRefreshFavicon(entity)} />
    </>
  );
}

// Memoize component for better performance
export default React.memo(EmojiActionMenu);
