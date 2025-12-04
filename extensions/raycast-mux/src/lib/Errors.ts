import { BadRequestError } from "@mux/mux-node";
import { Asset } from "@mux/mux-node/resources/video/assets";
import Raycast from "raycast-effect";
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
  Raycast.Feedback.showToast({
    title: e.errors.messages?.[0] || "An unknown error occurred.",
    style: Toast.Style.Failure,
  });

export class ToastableError {
  readonly _tag = "ToastableError";
  readonly message: string;

  constructor(message: string) {
    this.message = message;
  }
}

export const HandleToastableError = (e: ToastableError) =>
  Raycast.Feedback.showToast({
    title: e.message,
    style: Toast.Style.Failure,
  });

export const HandleClipboardError = () =>
  Raycast.Feedback.showToast({
    title: "Unable to copy to clipboard",
    style: Toast.Style.Failure,
  });
