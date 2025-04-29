import { Detail, LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AssetDetails from "./components/AssetDetails.js";
import Runtime, { effectView } from "./lib/Runtime.js";
import { Effect } from "effect";
import { MuxRepo } from "./lib/MuxRepo.js";

export default effectView(
  Effect.fn(function* (props: LaunchProps<{ arguments: Arguments.InspectAsset }>) {
    const mux = yield* MuxRepo;

    const asset = useCachedPromise(
      (id: string) => mux.getAsset(id).pipe(Runtime.runPromise),
      [props.arguments.muxAssetId],
    );

    return asset.isLoading ? <Detail isLoading={true} /> : <AssetDetails asset={asset.data!} />;
  }),
);
