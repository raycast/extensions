import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import type { RaycastCard } from "../lib/api";
import {
  getCardTitle,
  getOpenableUrl,
  getTeakUrl,
} from "../lib/cardDetailModel";
import type { ParsedSearchFilters } from "../lib/searchFilters";
import {
  deleteCardForever,
  moveCardToTrash,
  restoreFromTrash,
} from "../lib/trashActions";
import { AccountActions } from "./AccountActions";
import { CardDetail } from "./CardDetail";
import { CardFilterActions } from "./CardFilterActions";
import { CardCopyActions, CardOrganizeActions } from "./CardOrganizeActions";
import { EditCardForm } from "./EditCardForm";

export interface CardListActionsProps {
  canSaveSmartFolder: boolean;
  card: RaycastCard;
  filters: ParsedSearchFilters;
  inTrash: boolean;
  keepNewestSort: boolean;
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
    <ActionPanel title={getCardTitle(card, 40)}>
      <ActionPanel.Section>
        <Action.Push
          icon={Icon.Sidebar}
          target={
            <CardDetail
              card={card}
              onCardDeleted={onCardRemoved}
              onCardUpdated={onCardUpdated}
              onFilterByTag={
                props.removeTagFilterFromList ? undefined : onFilterByTag
              }
              onNavigateBackAfterDelete={() => undefined}
              onSignedOut={onSignedOut}
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
            shortcut={Keyboard.Shortcut.Common.OpenWith}
            title="Open File"
            url={card.fileUrl}
          />
        ) : null}
        <Action.OpenInBrowser
          icon={Icon.AppWindow}
          shortcut={Keyboard.Shortcut.Common.Open}
          title="Open in Teak"
          url={getTeakUrl(card)}
        />
      </ActionPanel.Section>
      {inTrash ? (
        <ActionPanel.Section title="Trash">
          <Action
            icon={Icon.ArrowCounterClockwise}
            onAction={() => void restoreFromTrash(card, onCardRemoved)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            title="Restore"
          />
          <Action
            icon={Icon.Trash}
            onAction={() => void deleteCardForever(card, onCardRemoved)}
            shortcut={Keyboard.Shortcut.Common.Remove}
            style={Action.Style.Destructive}
            title="Delete Forever"
          />
        </ActionPanel.Section>
      ) : (
        <CardOrganizeActions card={card} onCardUpdated={onCardUpdated}>
          <Action
            icon={card.isFavorited ? Icon.StarDisabled : Icon.Star}
            onAction={() => onToggleFavorite(card)}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            title={card.isFavorited ? "Unfavorite" : "Favorite"}
          />
          <Action.Push
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<EditCardForm card={card} onCardUpdated={onCardUpdated} />}
            title="Edit Card"
          />
        </CardOrganizeActions>
      )}
      <CardFilterActions
        canSaveSmartFolder={props.canSaveSmartFolder}
        card={card}
        filters={props.filters}
        keepNewestSort={props.keepNewestSort}
        onQueryChange={props.onQueryChange}
        onShuffle={props.onShuffle}
        removeTagFilterFromList={props.removeTagFilterFromList}
        showFavoritesFilter={props.showFavoritesFilter}
      />
      <CardCopyActions card={card} />
      {inTrash ? null : (
        <ActionPanel.Section>
          <Action
            icon={Icon.Trash}
            onAction={() =>
              void moveCardToTrash(card, {
                onRemoved: onCardRemoved,
                onRestored: onCardUpdated,
              })
            }
            shortcut={Keyboard.Shortcut.Common.Remove}
            style={Action.Style.Destructive}
            title="Move to Trash"
          />
        </ActionPanel.Section>
      )}
      <AccountActions onSignedOut={onSignedOut} />
    </ActionPanel>
  );
}
