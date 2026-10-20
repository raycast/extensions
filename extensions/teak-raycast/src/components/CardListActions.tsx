import { Action, ActionPanel, Icon } from "@raycast/api";
import type { RaycastCard } from "../lib/api";
import { getOpenableUrl, getTeakUrl } from "../lib/cardDetailModel";
import type { ParsedSearchFilters } from "../lib/searchFilters";
import {
  deleteCardForever,
  moveCardToTrash,
  restoreFromTrash,
} from "../lib/trashActions";
import { CardDetail } from "./CardDetail";
import { CardFilterActions } from "./CardFilterActions";
import { CardOrganizeActions } from "./CardOrganizeActions";
import { EditCardForm } from "./EditCardForm";
import { SetApiKeyAction } from "./SetApiKeyAction";
import { SignOutAction } from "./SignOutAction";

export interface CardListActionsProps {
  card: RaycastCard;
  filters: ParsedSearchFilters;
  inTrash: boolean;
  onCardRemoved: (cardId: string) => void;
  onCardUpdated: (card: RaycastCard) => void;
  onFilterByTag: (tag: string) => void;
  onQueryChange: (update: (previous: string) => string) => void;
  onShuffle: () => void;
  onSignedOut: () => void;
  onToggleFavorite: (card: RaycastCard) => void;
  removeTagFilterFromList: boolean;
  showFavoritesFilter: boolean;
}

export function CardListActions(props: CardListActionsProps) {
  const {
    card,
    inTrash,
    onCardRemoved,
    onCardUpdated,
    onFilterByTag,
    onSignedOut,
    onToggleFavorite,
  } = props;
  const openableUrl = getOpenableUrl(card);
  return (
    <ActionPanel>
      <Action.Push
        icon={Icon.Eye}
        target={
          <CardDetail
            card={card}
            onCardDeleted={onCardRemoved}
            onCardUpdated={onCardUpdated}
            onFilterByTag={onFilterByTag}
            onNavigateBackAfterDelete={() => undefined}
          />
        }
        title="View Card"
      />
      {openableUrl ? (
        <Action.OpenInBrowser title="Open URL" url={openableUrl} />
      ) : null}
      {card.fileUrl ? (
        <Action.OpenInBrowser
          icon={Icon.Paperclip}
          title="Open File"
          url={card.fileUrl}
        />
      ) : null}
      <Action.OpenInBrowser title="Open in Teak" url={getTeakUrl(card)} />
      {inTrash ? (
        <ActionPanel.Section>
          <Action
            icon={Icon.ArrowCounterClockwise}
            onAction={() => void restoreFromTrash(card, onCardRemoved)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            title="Restore"
          />
          <Action
            icon={Icon.Trash}
            onAction={() => void deleteCardForever(card, onCardRemoved)}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            style={Action.Style.Destructive}
            title="Delete Forever"
          />
        </ActionPanel.Section>
      ) : (
        <ActionPanel.Section>
          <Action
            icon={Icon.Star}
            onAction={() => onToggleFavorite(card)}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            title={card.isFavorited ? "Remove Favorite" : "Add Favorite"}
          />
          <Action.Push
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<EditCardForm card={card} onCardUpdated={onCardUpdated} />}
            title="Edit Card"
          />
          <Action
            icon={Icon.Trash}
            onAction={() =>
              void moveCardToTrash(card, {
                onRemoved: onCardRemoved,
                onRestored: onCardUpdated,
              })
            }
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            style={Action.Style.Destructive}
            title="Move to Trash"
          />
        </ActionPanel.Section>
      )}
      {inTrash ? null : (
        <CardOrganizeActions card={card} onCardUpdated={onCardUpdated} />
      )}
      <CardFilterActions
        card={card}
        filters={props.filters}
        onQueryChange={props.onQueryChange}
        onShuffle={props.onShuffle}
        removeTagFilterFromList={props.removeTagFilterFromList}
        showFavoritesFilter={props.showFavoritesFilter}
      />
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard content={card.content} title="Copy Content" />
        {card.url ? (
          <Action.CopyToClipboard content={card.url} title="Copy URL" />
        ) : null}
        <Action.CopyToClipboard
          content={getTeakUrl(card)}
          title="Copy Teak Link"
        />
      </ActionPanel.Section>
      <SetApiKeyAction />
      <SignOutAction onSignedOut={onSignedOut} />
    </ActionPanel>
  );
}
