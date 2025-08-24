import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard } from "@raycast/api";
import { Effect } from "effect";
import { effectView, useEffectFn } from "../lib/Runtime.js";
import Mux from "@mux/mux-node";
import { MuxRepo } from "../lib/MuxRepo.js";
import { Preferences } from "../lib/Preferences.js";
import Raycast from "raycast-effect";
import { HandleMuxAssetError } from "../lib/Errors.js";

type AssetActionsProps = {
  asset: Mux.Video.Asset;
  onDelete?: () => void;
};

export default effectView(
  Effect.fn(function* ({ asset, onDelete }: AssetActionsProps) {
    const mux = yield* MuxRepo;
    const preferences = yield* Preferences;
    const playbackId = asset.playback_ids?.find((pid) => pid.policy === "public");
    const staticRendition = asset.static_renditions?.files?.sort((a, b) => (b.width || 0) - (a.width || 0)).at(0);

    const handleEnableStaticRendition = useEffectFn(() =>
      mux.enableMp4(asset.id).pipe(
        Effect.andThen(() =>
          Raycast.Feedback.showToast({
            title: "Static Rendition Requested",
          }),
        ),
        Effect.catchTag("MuxAssetError", HandleMuxAssetError),
      ),
    );

    const handleDeleteAsset = () =>
      confirmAlert({
        icon: { source: Icon.Trash, tintColor: Color.Red },
        title: "Are you sure you'd like to delete this asset?",
        message: "This cannot be undone!",
        primaryAction: {
          title: "Delete Forever",
          style: Alert.ActionStyle.Destructive,
          onAction: useEffectFn(() =>
            mux.deleteAsset(asset.id).pipe(
              Effect.tap(() => Effect.sync(() => onDelete && onDelete())),
              Effect.andThen(() =>
                Raycast.Feedback.showToast({
                  title: "Asset Deleted",
                }),
              ),
              Effect.catchTag("MuxAssetError", HandleMuxAssetError),
            ),
          ),
        },
      });

    return (
      <>
        <Action.OpenInBrowser
          url={`https://dashboard.mux.com/organizations/${preferences.organizationId}/environments/${preferences.environmentId}/video/assets/${asset.id}/monitor`}
        />
        <Action.CopyToClipboard
          /* eslint-disable-next-line @raycast/prefer-title-case */
          title="Copy Asset ID to Clipboard"
          content={asset.id}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        {playbackId && (
          <Action.CopyToClipboard
            /* eslint-disable-next-line @raycast/prefer-title-case */
            title="Copy Playback ID to Clipboard"
            content={playbackId?.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        )}
        {playbackId && (
          <>
            <ActionPanel.Section title="Static Rendition">
              {staticRendition !== undefined ? (
                <>
                  <Action.OpenInBrowser
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title="Open MP4 in Browser"
                    url={`https://stream.mux.com/${playbackId?.id}/${staticRendition?.name}`}
                  />
                  <Action.CopyToClipboard
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title="Copy MP4 URL to Clipboard"
                    content={`https://stream.mux.com/${playbackId?.id}/${staticRendition?.name}`}
                  />
                </>
              ) : (
                <Action title="Enable Static Rendition" onAction={handleEnableStaticRendition} />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title="Thumbnails">
              <Action.OpenInBrowser
                title="Open Thumbnail in Browser"
                url={`https://image.mux.com/${playbackId?.id}/thumbnail.png`}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action.CopyToClipboard
                title="Copy Thumbnail URL to Clipboard"
                content={`https://image.mux.com/${playbackId?.id}/thumbnail.png`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              />
            </ActionPanel.Section>
          </>
        )}
        <Action
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          title="Delete Asset"
          onAction={handleDeleteAsset}
          shortcut={Keyboard.Shortcut.Common.Remove}
        />
      </>
    );
  }),
);
