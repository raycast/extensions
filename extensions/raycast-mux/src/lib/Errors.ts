import { BadRequestError } from "@mux/mux-node";
import { Asset } from "@mux/mux-node/resources/video/assets";
import { showFailureToast } from "@raycast/utils";
import { Effect } from "effect";
import Raycast from "raycast-effect";
import { ClipboardError } from "raycast-effect/Clipboard";
import { Toast } from "@raycast/api";

export class MuxAssetError {
  readonly _tag = "MuxAssetError";
  readonly errors: Asset.Errors;

  constructor(e: unknown) {
    const error = (e as BadRequestError).error as { error: Asset.Errors };
    this.errors = error.error;
  }
}

export const HandleMuxAssetError = (e: MuxAssetError) =>
  Effect.promise(async () => {
    await showFailureToast(e.errors.messages?.[0] || e);
  });

export class ToastableError {
  readonly _tag = "ToastableError";
  readonly message: string;

  constructor(message: string) {
    this.message = message;
  }
}

export const HandleToastableError = (e: ToastableError) =>
  Effect.promise(async () => {
    await showFailureToast(e.message);
  });

export const HandleClipboardError = (e: ClipboardError) =>
  Raycast.Feedback.showToast({
    title: "Unable to copy to clipboard",
    message: e.message,
    style: Toast.Style.Failure,
  });
