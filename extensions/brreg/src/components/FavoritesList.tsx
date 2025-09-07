import { ActionPanel, List, showToast, Toast } from "@raycast/api";
import { Enhet } from "../types";
import { formatAddress } from "../utils/format";
import { canMoveUp, canMoveDown } from "../utils/entity";
import EntityActions from "./EntityActions";
import FavoriteActions from "./FavoriteActions";

interface FavoritesListProps {
  favorites: Enhet[];
  showMoveIndicators: boolean;
  onViewDetails: (entity: Enhet) => void;
  onRemoveFavorite: (entity: Enhet) => void;
  onUpdateEmoji: (entity: Enhet, emoji?: string) => void;
  onResetToFavicon: (entity: Enhet) => void;
  onRefreshFavicon: (entity: Enhet) => void;
  onMoveUp: (entity: Enhet) => void;
  onMoveDown: (entity: Enhet) => void;
  onToggleMoveMode: () => void;
}

export default function FavoritesList({
  favorites,
  showMoveIndicators,
  onViewDetails,
  onRemoveFavorite,
  onUpdateEmoji,
  onResetToFavicon,
  onRefreshFavicon,
  onMoveUp,
  onMoveDown,
  onToggleMoveMode,
}: FavoritesListProps) {
  if (favorites.length === 0) {
    return (
      <List.Section title="Favorites">
        <List.Item
          title="No favorites yet"
          subtitle="Search and ⌘F to add favorites "
          icon="⭐"
          // accessories={[
          //   { text: "Search above to find companies" },
          //   { text: "Use ⌘F to add to favorites" },
          //   { text: "Organize with custom emojis" },
          // ]}
        />
      </List.Section>
    );
  }

  return (
    <List.Section title={`Favorites${showMoveIndicators ? " - Move Mode Active (⌘⇧)" : ""}`}>
      {favorites.map((entity, index) => {
        const addressString = formatAddress(entity.forretningsadresse);
        const canMoveUpFlag = canMoveUp(index);
        const canMoveDownFlag = canMoveDown(index, favorites.length);

        return (
          <List.Item
            key={`fav-${entity.organisasjonsnummer}`}
            title={entity.navn}
            subtitle={entity.organisasjonsnummer}
            icon={entity.emoji ? entity.emoji : entity.faviconUrl ? entity.faviconUrl : "Icon.Globe"}
            accessories={[
              ...(addressString ? [{ text: addressString }] : []),
              ...(showMoveIndicators && canMoveUpFlag
                ? [
                    {
                      icon: "Icon.ArrowUp",
                      text: "Move up",
                      tooltip: "⌘⇧↑ to move up",
                    },
                  ]
                : []),
              ...(showMoveIndicators && canMoveDownFlag
                ? [
                    {
                      icon: "Icon.ArrowDown",
                      text: "Move down",
                      tooltip: "⌘⇧↓ to move down",
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <EntityActions
                  entity={entity}
                  addressString={addressString}
                  onViewDetails={onViewDetails}
                  onCopyOrgNumber={() => {
                    // Show success toast - clipboard is handled by Action.CopyToClipboard
                  }}
                  onCopyAddress={() => {
                    // Show success toast - clipboard is handled by Action.CopyToClipboard
                  }}
                  onOpenInBrowser={() => showToast(Toast.Style.Success, "Opening in browser")}
                />
                <FavoriteActions
                  entity={entity}
                  index={index}
                  showMoveIndicators={showMoveIndicators}
                  onRemoveFavorite={onRemoveFavorite}
                  onUpdateEmoji={onUpdateEmoji}
                  onResetToFavicon={onResetToFavicon}
                  onRefreshFavicon={onRefreshFavicon}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onToggleMoveMode={onToggleMoveMode}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
