import {
  Action,
  ActionPanel,
  Application,
  Color,
  Grid,
  Icon,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import { useMemo, useState } from "react";
import { IconActions } from "./components/icon-actions.tsx";
import { getDefaultIconPath, setIcon } from "./helpers/icons.ts";
import { ApplicationState, Store } from "./helpers/store.ts";
import { useModifiableApplications } from "./helpers/utils.ts";
import SearchIconsCommand from "./search-icons.tsx";
import { IconMetadata } from "./types.ts";

TimeAgo.addDefaultLocale(en);

const timeAgo = new TimeAgo("en");

export default function ManageIconsCommand() {
  const [searchText, setSearchText] = useState("");
  const [modifiedFavorites, setModifiedFavorites] = useState<IconMetadata[]>();

  const { data: favorites, isLoading: isFavoritesLoading } = useCachedPromise(
    Store.getFavorites,
  );
  const { data: apps, isLoading: isAppsLoading } = useModifiableApplications();
  const {
    data: state,
    isLoading: isStateLoading,
    revalidate: revalidateState,
  } = useCachedPromise(Store.getState);

  const isLoading = isFavoritesLoading || isAppsLoading || isStateLoading;

  const activeApps = useMemo(() => {
    if (!state || !apps) return [];

    const bundleIds = Object.keys(state);
    return bundleIds
      .map((bundleId) => apps.find((app) => app.bundleId === bundleId))
      .filter(Boolean)
      .toSorted((a, b) => a!.name.localeCompare(b!.name)) as Application[];
  }, [state, apps]);

  const hasActiveApps = activeApps.length > 0;

  const filteredApps = useMemo(() => {
    return activeApps.filter((app) =>
      app?.name.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [activeApps, searchText]);

  const sortedFavorites = useMemo(() => {
    return favorites?.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [favorites]);

  return (
    <Grid
      columns={6}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarPlaceholder="Filter applications"
    >
      <Grid.Section title="Favorites" columns={8}>
        {sortedFavorites?.map((favorite) => (
          <Grid.Item
            key={favorite.objectID}
            title={favorite.name}
            content={{ source: favorite.lowResPngUrl, fallback: Icon.Document }}
            accessory={
              !modifiedFavorites
                ? {}
                : modifiedFavorites.find(
                      (f) => f.objectID === favorite.objectID,
                    )
                  ? {}
                  : {
                      icon: {
                        source: Icon.Trash,
                        tintColor: Color.Red,
                      },
                    }
            }
            actions={
              <IconActions
                icon={favorite}
                searchText={favorite.name}
                skipRefreshFavorites={true}
                onFavoritesChange={setModifiedFavorites}
              />
            }
          />
        ))}
      </Grid.Section>
      {state &&
        filteredApps.map((app) => (
          <ApplicationSection
            key={app.bundleId}
            application={app}
            state={state[app.bundleId!]!}
            onIconUpdated={revalidateState}
          />
        ))}
      <Grid.EmptyView
        icon={!hasActiveApps ? Icon.Tray : undefined}
        title={"No icons found"}
        description={
          !hasActiveApps
            ? `Your collection is empty, press enter to open search`
            : ""
        }
        actions={
          <ActionPanel>
            <Action.Push
              title="Open Search"
              target={<SearchIconsCommand />}
              icon={Icon.MagnifyingGlass}
              onPop={revalidateState}
            />
          </ActionPanel>
        }
      />
    </Grid>
  );
}

function ApplicationSection({
  application,
  state,
  onIconUpdated,
}: {
  application: Application;
  state: ApplicationState;
  onIconUpdated?: () => void;
}) {
  const { data: defaultIconPath } = useCachedPromise(getDefaultIconPath, [
    application,
  ]);

  const revert = async () => {
    await setIcon(application, null);
    onIconUpdated?.();
  };

  return (
    <Grid.Section title={application.name} key={application.bundleId}>
      <Grid.Item
        title="Default"
        content={{ source: defaultIconPath ?? "", fallback: Icon.Document }}
        accessory={
          state.activeId
            ? {}
            : {
                icon: {
                  source: Icon.Dot,
                  tintColor: Color.Green,
                },
              }
        }
        actions={
          <ActionPanel>
            <Action
              title="Revert Icon to Default"
              icon={Icon.Undo}
              onAction={revert}
            />
          </ActionPanel>
        }
      />
      {state.recent?.map((icon) => (
        <Grid.Item
          key={icon.objectID}
          title={icon.name}
          subtitle={timeAgo.format(icon.updatedAt)}
          content={{
            source: icon.lowResPngUrl,
            fallback: Icon.DeleteDocument,
          }}
          accessory={
            state.activeId === icon.objectID
              ? {
                  icon: {
                    source: Icon.Dot,
                    tintColor: Color.Green,
                  },
                }
              : {}
          }
          actions={
            <IconActions
              icon={icon}
              application={application}
              onApplied={onIconUpdated}
            />
          }
        />
      ))}
    </Grid.Section>
  );
}
