import { Action, ActionPanel, Icon } from "@raycast/api";
import type { RaycastCard } from "../lib/api";
import {
  archiveCard,
  refreshCardDetails,
  toggleCardDone,
  unarchiveCard,
} from "../lib/cardActions";
import { getCardTitle } from "../lib/cardDetailModel";
import { canMarkDone, doneActionTitle, isDone } from "../lib/doneStates";
import { AddToFolderList } from "./AddToFolderList";
import { SimilarCardsView } from "./SimilarCardsView";

interface CardOrganizeActionsProps {
  card: RaycastCard;
  onCardUpdated: (card: RaycastCard) => void;
}

export function CardOrganizeActions({
  card,
  onCardUpdated,
}: CardOrganizeActionsProps) {
  return (
    <ActionPanel.Section title="Organize">
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
        icon={Icon.Stars}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        target={
          <SimilarCardsView cardId={card.id} title={getCardTitle(card)} />
        }
        title="Find Similar"
      />
      <Action.Push
        icon={Icon.Folder}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        target={<AddToFolderList card={card} onCardUpdated={onCardUpdated} />}
        title="Add to Folder…"
      />
      <Action
        icon={Icon.Box}
        onAction={() =>
          void (card.isArchived
            ? unarchiveCard(card, onCardUpdated)
            : archiveCard(card, onCardUpdated))
        }
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        title={card.isArchived ? "Unarchive" : "Archive Card"}
      />
      <Action
        icon={Icon.ArrowClockwise}
        onAction={() => void refreshCardDetails(card)}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        title="Refresh Details"
      />
    </ActionPanel.Section>
  );
}
