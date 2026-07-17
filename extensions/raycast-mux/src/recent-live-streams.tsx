import { useCachedPromise } from "@raycast/utils";
import { Action, ActionPanel, Color, Icon, List, Toast } from "@raycast/api";
// import AssetDetails from "./components/AssetDetails.js";
import { Effect, Schema } from "effect";
import { MuxRepo } from "./lib/MuxRepo.js";
import Runtime, { effectView, useEffectFn } from "./lib/Runtime.js";
import Raycast from "raycast-effect";
import { Preferences } from "./lib/Preferences.js";

const capitalize = Schema.decodeUnknownSync(Schema.Capitalize);

export default effectView(
  Effect.fn(function* () {
    const mux = yield* MuxRepo;
    const preferences = yield* Preferences;

    const liveStreams = useCachedPromise(
      () => (options) =>
        mux.getLiveStreams(options).pipe(
          Effect.map((resp) => ({
            data: resp.data,
            hasMore: resp.hasNextPage(),
          })),
          Runtime.runPromise,
        ),
    );

    const handleInspectAsset = useEffectFn(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Effect.fn(function* (_id: string) {
        yield* Raycast.Feedback.showToast({
          title: "Not Implemented Yet...",
          style: Toast.Style.Failure,
        });
        // yield* Raycast.Feedback.showToast({
        //   title: "Loading Asset Details...",
        //   style: Toast.Style.Animated,
        // });

        // const asset = yield* MuxRepo.getAsset(id);
        // yield* Raycast.Navigate.push(<AssetDetails asset={asset} />);
      }),
    );

    const handleDisableLiveStream = useEffectFn(
      Effect.fn(function* (id: string) {
        yield* Raycast.Feedback.showToast({
          title: "Disabling Live Stream...",
          style: Toast.Style.Animated,
        });

        yield* MuxRepo.disableLiveStream(id);

        yield* Raycast.Feedback.showToast({
          title: "Live Stream Disabled",
        });

        liveStreams.revalidate();
      }),
    );

    const handleEnableLiveStream = useEffectFn(
      Effect.fn(function* (id: string) {
        yield* Raycast.Feedback.showToast({
          title: "Enabling Live Stream...",
          style: Toast.Style.Animated,
        });

        yield* MuxRepo.enableLiveStream(id);

        yield* Raycast.Feedback.showToast({
          title: "Live Stream Enabled",
        });

        liveStreams.revalidate();
      }),
    );

    const handleResetStreamKey = useEffectFn(
      Effect.fn(function* (id: string) {
        yield* Raycast.Feedback.showToast({
          title: "Resetting Stream Key...",
          style: Toast.Style.Animated,
        });

        yield* MuxRepo.resetStreamKey(id);

        yield* Raycast.Feedback.showToast({
          title: "Stream Key Reset",
        });

        liveStreams.revalidate();
      }),
    );

    return (
      <List isLoading={liveStreams.isLoading} pagination={liveStreams.pagination} isShowingDetail>
        {liveStreams.data?.map((liveStream) => (
          <List.Item
            key={liveStream.id}
            title={liveStream.passthrough || ""}
            subtitle={liveStream.id}
            accessories={[
              {
                icon: {
                  source: liveStream.status === "disabled" ? Icon.LivestreamDisabled : Icon.Livestream,
                  tintColor:
                    liveStream.status === "disabled"
                      ? Color.Red
                      : liveStream.status === "active"
                        ? Color.Green
                        : Color.SecondaryText,
                },
                tooltip: capitalize(liveStream.status),
              },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Live Stream ID" text={liveStream.id} />
                    <List.Item.Detail.Metadata.Label title="Stream Key" text={liveStream.stream_key} />
                    <List.Item.Detail.Metadata.Label title="RTMPS URL" text="rtmps://global-live.mux.com:443/app" />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="SRT URL" text="srt://global-live.mux.com:6001" />
                    <List.Item.Detail.Metadata.Label title="SRT Stream ID" text={liveStream.stream_key} />
                    <List.Item.Detail.Metadata.Label title="SRT Passphrase" text={liveStream.srt_passphrase} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Audio Only"
                      text={liveStream.audio_only ? "True" : "False"}
                    />
                    <List.Item.Detail.Metadata.Label title="Created" text={liveStream.created_at} />
                    <List.Item.Detail.Metadata.Label title="Status" text={capitalize(liveStream.status)} />
                    <List.Item.Detail.Metadata.Label title="Active Asset ID" text={liveStream.active_asset_id} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Recent Asset IDs">
                      {liveStream.recent_asset_ids?.map((aid) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={aid}
                          text={aid}
                          onAction={() => handleInspectAsset(aid)}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Simulcast Targets">
                      {liveStream.simulcast_targets?.map((t) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={t.id}
                          text={t.passthrough || ""}
                          icon={t.status == "broadcasting" ? Icon.Livestream : Icon.LivestreamDisabled}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={`https://dashboard.mux.com/organizations/${preferences.organizationId}/environments/${preferences.environmentId}/video/live-streams/${liveStream.id}/monitor`}
                />
                <ActionPanel.Section title="Stream Configuration">
                  {/* eslint-disable-next-line @raycast/prefer-title-case */}
                  <Action.CopyToClipboard title="Copy Live Stream ID" content={liveStream.id} />
                  <Action.CopyToClipboard title="Copy Stream Key" content={liveStream.stream_key} concealed={true} />
                  {liveStream.srt_passphrase && (
                    <>
                      <Action.CopyToClipboard
                        /* eslint-disable-next-line @raycast/prefer-title-case */
                        title="Copy SRT Passphrase"
                        content={liveStream.srt_passphrase}
                        concealed={true}
                      />
                    </>
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Controls">
                  {liveStream.status !== "disabled" ? (
                    <Action
                      icon={Icon.LivestreamDisabled}
                      style={Action.Style.Destructive}
                      title="Disable Live Stream"
                      onAction={() => handleDisableLiveStream(liveStream.id)}
                    />
                  ) : (
                    <Action
                      icon={Icon.Livestream}
                      title="Enable Live Stream"
                      onAction={() => handleEnableLiveStream(liveStream.id)}
                    />
                  )}
                  <Action
                    icon={Icon.RotateClockwise}
                    style={Action.Style.Destructive}
                    title="Reset Stream Key"
                    onAction={() => handleResetStreamKey(liveStream.id)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }),
);
