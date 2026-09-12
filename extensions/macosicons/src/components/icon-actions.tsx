import { Action, ActionPanel, Application, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { setIcon } from "../helpers/icons.ts";
import { Store } from "../helpers/store.ts";
import { useModifiableApplications } from "../helpers/utils.ts";
import { IconMetadata } from "../types.ts";

export function IconActions({
  icon,
  searchText,
  application,
  skipRefreshFavorites,
  onFavoritesChange,
  onApplied,
}: {
  icon: IconMetadata;
  searchText?: string;
  application?: Application;
  skipRefreshFavorites?: boolean;
  onFavoritesChange?: (favorites: IconMetadata[]) => void;
  onApplied?: () => void;
}) {
  const { data: favorites, mutate: mutateFavorites } = usePromise(
    Store.getFavorites,
  );
  const { data: applications, isLoading: isApplicationsLoading } =
    useModifiableApplications(searchText);

  const isFavorite = favorites?.find((f) => f.objectID === icon.objectID);

  return (
    <ActionPanel>
      {application ? (
        <Action
          title="Apply Icon"
          icon={Icon.PlusTopRightSquare}
          onAction={async () => {
            await setIcon(application, icon);
            onApplied?.();
          }}
        />
      ) : (
        <ActionPanel.Submenu
          title="Apply Icon to"
          icon={Icon.PlusTopRightSquare}
          isLoading={isApplicationsLoading}
        >
          {(applications ?? []).map((app) => (
            <Action
              title={app.name}
              icon={{ fileIcon: app.path }}
              onAction={async () => {
                await setIcon(app, icon);
                onApplied?.();
              }}
              key={app.path}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      <Action
        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        icon={isFavorite ? Icon.HeartDisabled : Icon.Heart}
        onAction={async () => {
          const favorites = await mutateFavorites(
            Store.toggleFavorite(icon, skipRefreshFavorites),
          );
          onFavoritesChange?.(favorites);
        }}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
      />
      <Action.Open
        title="Download Icon"
        target={icon.icnsUrl}
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
      />
      <Action.CopyToClipboard
        title="Copy URL to Clipboard"
        content={{ html: icon.icnsUrl }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      ></Action.CopyToClipboard>
    </ActionPanel>
  );
}
