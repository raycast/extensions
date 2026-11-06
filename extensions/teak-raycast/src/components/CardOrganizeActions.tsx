import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import type { RaycastCard } from "../lib/api";
import {
  archiveCard,
  refreshCardDetails,
  toggleCardDone,
  unarchiveCard,
} from "../lib/cardActions";
import {
  getCardTitle,
  getOpenableUrl,
  getTeakUrl,
} from "../lib/cardDetailModel";
import { canMarkDone, doneActionTitle, isDone } from "../lib/doneStates";
import { AddToFolderList } from "./AddToFolderList";
import { SimilarCardsView } from "./SimilarCardsView";

interface CardOrganizeActionsProps {
  card: RaycastCard;
  /** Actions that lead the section, such as Favorite and Edit Card. */
  children?: ActionPanel.Section.Props["children"];
  onCardUpdated: (card: RaycastCard) => void;
}

export function CardOrganizeActions({
  card,
  children,
  onCardUpdated,
}: CardOrganizeActionsProps) {
  return (
    <ActionPanel.Section title="Card">
      {children}
      {canMarkDone(card) ? (
        <Action
          icon={isDone(card) ? Icon.CheckCircle : Icon.Circle}
          onAction={() =>
            void toggleCardDone(card, !isDone(card), onCardUpdated)
          }
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          title={doneActionTitle(card)}
        />
      ) : null}
      <Action.Push
        icon={Icon.Folder}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        target={<AddToFolderList card={card} onCardUpdated={onCardUpdated} />}
        title="Add to Folder…"
      />
      <Action.Push
        icon={Icon.Stars}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        target={
          <SimilarCardsView cardId={card.id} title={getCardTitle(card)} />
        }
        title="More Like This"
      />
      <Action
        icon={Icon.Box}
        onAction={() =>
          void (card.isArchived
            ? unarchiveCard(card, onCardUpdated)
            : archiveCard(card, onCardUpdated))
        }
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        title={card.isArchived ? "Unarchive" : "Archive"}
      />
      <Action
        icon={Icon.ArrowClockwise}
        onAction={() => void refreshCardDetails(card)}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        title="Refresh Details"
      />
    </ActionPanel.Section>
  );
}

/** Copy URL (or the text, for a card without one), then the text and the Teak link. */
export function CardCopyActions({
  card,
  children,
}: {
  card: RaycastCard;
  /** Extra copy actions, such as the Copy Color submenu. */
  children?: ActionPanel.Section.Props["children"];
}) {
  const url = getOpenableUrl(card) ?? card.url;
  const content = card.content.trim();
  return (
    <ActionPanel.Section title="Copy">
      {url ? (
        <Action.CopyToClipboard
          content={url}
          shortcut={Keyboard.Shortcut.Common.Copy}
          title="Copy URL"
        />
      ) : null}
      {content && content !== url ? (
        <Action.CopyToClipboard
          content={card.content}
          shortcut={
            url
              ? { modifiers: ["cmd", "opt"], key: "c" }
              : Keyboard.Shortcut.Common.Copy
          }
          title="Copy Content"
        />
      ) : null}
      <Action.CopyToClipboard
        content={getTeakUrl(card)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        title="Copy Teak Link"
      />
      {children}
    </ActionPanel.Section>
  );
}
