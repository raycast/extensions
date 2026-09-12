import { Action, ActionPanel, Grid } from "@raycast/api";
import { useState, type ReactNode } from "react";
import { useProgressiveImages } from "../hooks/useProgressiveImages";
import { MOBBIN_ICON } from "../lib/assets";
import {
  REFERENCE_GRID_COLUMNS,
  flowGridAspectRatio,
} from "../lib/presentation";
import type { FavoriteReference, FlowReference } from "../lib/types";
import { ReferenceActions } from "./ReferenceActions";

type Props = {
  flow: FlowReference;
  favorites: FavoriteReference[];
  downloadedPaths: Map<string, string>;
  onFavoriteChange: () => Promise<void> | void;
  onDownloaded: (referenceId: string, path?: string) => void;
  globalActions: ReactNode;
};

export function FlowDetail({
  flow,
  favorites,
  downloadedPaths,
  onFavoriteChange,
  onDownloaded,
  globalActions,
}: Props) {
  const [selectedScreenId, setSelectedScreenId] = useState<
    string | undefined
  >();
  const favoriteIds = new Set(
    favorites.map((favorite) => `${favorite.kind}:${favorite.id}`),
  );
  const aspectRatio = flowGridAspectRatio(flow);
  const selectedScreen = flow.screens.find(
    (candidate, index) => `${candidate.id}-${index}` === selectedScreenId,
  );
  useProgressiveImages({
    references: flow.screens,
    loadedPaths: downloadedPaths,
    onLoaded: onDownloaded,
    ...(selectedScreen ? { priorityKey: `screen:${selectedScreen.id}` } : {}),
  });

  return (
    <Grid
      navigationTitle={flow.title}
      columns={REFERENCE_GRID_COLUMNS}
      aspectRatio={aspectRatio}
      fit={Grid.Fit.Contain}
      inset={Grid.Inset.Small}
      onSelectionChange={(id) => setSelectedScreenId(id ?? undefined)}
    >
      {flow.screens.length === 0 ? (
        <Grid.EmptyView
          icon={MOBBIN_ICON}
          title="No Individual Screens"
          description="Open this flow in Mobbin to inspect its full sequence."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Flow in Mobbin"
                url={flow.mobbinUrl}
              />
              {globalActions}
            </ActionPanel>
          }
        />
      ) : null}
      {flow.screens.map((screen, index) => {
        const localPath =
          downloadedPaths.get(`screen:${screen.id}`) ?? screen.image.localPath;
        const source = localPath ?? screen.image.dataUrl;
        return (
          <Grid.Item
            key={`${screen.id}-${index}`}
            id={`${screen.id}-${index}`}
            content={source ? { source } : MOBBIN_ICON}
            title={`${index + 1}. ${screen.title}`}
            subtitle={screen.appName}
            {...(localPath
              ? {
                  quickLook: {
                    path: localPath,
                    name: `${screen.appName}${localPath.slice(localPath.lastIndexOf("."))}`,
                  },
                }
              : {})}
            actions={
              <ActionPanel>
                <ReferenceActions
                  reference={screen}
                  isFavorite={favoriteIds.has(`screen:${screen.id}`)}
                  onFavoriteChange={onFavoriteChange}
                  onDownloaded={onDownloaded}
                  {...(localPath ? { localPath } : {})}
                />
                {globalActions}
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
