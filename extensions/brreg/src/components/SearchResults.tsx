import { ActionPanel, List } from "@raycast/api";
import { Enhet } from "../types";
import { formatAddress } from "../utils/format";
import { getEntityIcon, isFavorite, getFavoriteEntity } from "../utils/entity";
import EntityActions from "./EntityActions";
import SearchResultActions from "./SearchResultActions";

interface SearchResultsProps {
  entities: Enhet[];
  favoriteIds: Set<string>;
  favoriteById: Map<string, Enhet>;
  onViewDetails: (entity: Enhet) => void;
  onAddFavorite: (entity: Enhet) => void;
  onRemoveFavorite: (entity: Enhet) => void;
  onUpdateEmoji: (entity: Enhet, emoji?: string) => void;
  onResetToFavicon: (entity: Enhet) => void;
  onRefreshFavicon: (entity: Enhet) => void;
}

export default function SearchResults({
  entities,
  favoriteIds,
  favoriteById,
  onViewDetails,
  onAddFavorite,
  onRemoveFavorite,
  onUpdateEmoji,
  onResetToFavicon,
  onRefreshFavicon,
}: SearchResultsProps) {
  if (entities.length === 0) {
    return (
      <List.Section title="Search Results">
        <List.Item
          title="No companies found"
          subtitle="Try adjusting your search terms"
          icon="🔍"
          accessories={[
            { text: "Search by company name" },
            { text: "Or organization number" },
            { text: "Results appear here" },
          ]}
        />
      </List.Section>
    );
  }

  return (
    <List.Section title="Results">
      {entities.map((entity) => {
        const addressString = formatAddress(entity.forretningsadresse);
        const alreadyFavorite = isFavorite(entity, favoriteIds);
        const fav = getFavoriteEntity(entity, favoriteById);
        const itemIcon = getEntityIcon(fav || entity);

        return (
          <List.Item
            key={entity.organisasjonsnummer}
            title={entity.navn}
            subtitle={entity.organisasjonsnummer}
            icon={itemIcon}
            accessories={addressString ? [{ text: addressString }] : []}
            actions={
              <ActionPanel>
                <EntityActions
                  entity={entity}
                  addressString={addressString}
                  onViewDetails={onViewDetails}
                  onCopyOrgNumber={() => {}}
                  onCopyAddress={() => {}}
                  onOpenInBrowser={() => {}}
                />
                <SearchResultActions
                  entity={entity}
                  isFavorite={alreadyFavorite}
                  favoriteEntity={fav}
                  onAddFavorite={onAddFavorite}
                  onRemoveFavorite={onRemoveFavorite}
                  onUpdateEmoji={onUpdateEmoji}
                  onResetToFavicon={onResetToFavicon}
                  onRefreshFavicon={onRefreshFavicon}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
