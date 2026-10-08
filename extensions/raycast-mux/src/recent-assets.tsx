import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import moment from "moment";
import AssetDetails from "./components/AssetDetails.js";
import AssetActions from "./components/AssetActions.js";
import { effectView, useEffectFn } from "./lib/Runtime.js";
import { Effect, Schema } from "effect";
import { MuxRepo } from "./lib/MuxRepo.js";
import { HandleMuxAssetError } from "./lib/Errors.js";
import { Asset } from "@mux/mux-node/src/resources/video/assets.js";

const capitalize = Schema.decodeUnknownSync(Schema.Capitalize);

export default effectView(
  Effect.fn(function* () {
    const mux = yield* MuxRepo;
    const { pop } = useNavigation();

    const assets = useCachedPromise(() =>
      useEffectFn(
        Effect.fn(
          function* (options) {
            const resp = yield* mux.getAssets(options);
            return {
              data: resp.data,
              hasMore: resp.hasNextPage(),
            };
          },
          Effect.catchTag("MuxAssetError", (e) =>
            HandleMuxAssetError(e).pipe(Effect.as({ data: [] as Asset[], hasMore: false })),
          ),
        ),
      ),
    );

    return (
      <List isLoading={assets.isLoading} pagination={assets.pagination}>
        {assets.data?.map((asset) => (
          <List.Item
            key={asset.id}
            icon={{ source: `https://image.mux.com/${asset.playback_ids?.[0].id}/thumbnail.png?width=50` }}
            title={asset.passthrough || ""}
            subtitle={asset.id}
            accessories={[
              {
                text: moment.duration(asset.duration, "seconds").humanize(),
              },
              asset.test
                ? {
                    icon: { source: Icon.Bug, tintColor: Color.Yellow },
                    tooltip:
                      "This is a free test asset. Test assets are limited to 10 seconds, include a Mux logo, and are deleted after 24 hours.",
                  }
                : {},
              {
                tag: {
                  value: capitalize(asset.status),
                  color: asset.status == "ready" ? Color.Green : asset.status == "preparing" ? Color.Yellow : Color.Red,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Inspect Asset"
                  icon={Icon.MagnifyingGlass}
                  target={
                    <AssetDetails
                      asset={asset}
                      onDelete={() => {
                        pop();
                        assets.revalidate();
                      }}
                    />
                  }
                />
                <Action
                  title="Reload Assets"
                  icon={Icon.ArrowClockwise}
                  onAction={assets.revalidate}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <AssetActions asset={asset} onDelete={assets.revalidate} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }),
);
