import { LaunchProps } from "@raycast/api";
import { Effect } from "effect";
import { HandleClipboardError, HandleMuxAssetError } from "./lib/Errors.js";
import { MuxRepo } from "./lib/MuxRepo.js";
import { effectCommand } from "./lib/Runtime.js";
import Raycast from "raycast-effect";

export default effectCommand(
  Effect.fn(
    function* (options: LaunchProps<{ arguments: Arguments.GetAssetId }>) {
      const mux = yield* MuxRepo;
      const asset = yield* mux.getByPlaybackId(options.arguments.muxPlaybackId);

      yield* Raycast.Feedback.showHUD("Copied Asset ID to clipboard");
      yield* Raycast.Clipboard.copy(asset.object.id);
    },
    Effect.tapError(Effect.log),
    Effect.catchTag("@raycast/ClipboardError", HandleClipboardError),
    Effect.catchTag("MuxAssetError", HandleMuxAssetError),
  ),
);
