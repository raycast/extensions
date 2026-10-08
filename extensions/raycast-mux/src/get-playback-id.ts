import { LaunchProps } from "@raycast/api";
import { Effect } from "effect";
import { HandleClipboardError, HandleMuxAssetError, HandleToastableError, ToastableError } from "./lib/Errors.js";
import { MuxRepo } from "./lib/MuxRepo.js";
import { effectCommand } from "./lib/Runtime.js";
import Raycast from "raycast-effect";

export default effectCommand(
  Effect.fn(
    function* (options: LaunchProps<{ arguments: Arguments.GetPlaybackId }>) {
      const mux = yield* MuxRepo;
      const asset = yield* mux.getAsset(options.arguments.muxAssetId);

      const playbackId = asset.playback_ids?.find((pbid) => pbid.policy == "public");
      if (!playbackId) {
        yield* Effect.fail(new ToastableError("No public Playback IDs exist!"));
        return;
      }

      yield* Raycast.Feedback.showHUD("Copied Playback ID to clipboard");
      yield* Raycast.Clipboard.copy(playbackId.id);
    },
    Effect.tapError(Effect.log),
    Effect.catchTag("@raycast/ClipboardError", HandleClipboardError),
    Effect.catchTag("MuxAssetError", HandleMuxAssetError),
    Effect.catchTag("ToastableError", HandleToastableError),
  ),
);
