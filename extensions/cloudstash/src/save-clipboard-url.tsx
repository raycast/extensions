import { Clipboard } from "@raycast/api";
import { Effect } from "effect";

import { EmptyClipboardError } from "./errors";
import { saveUrl, validateUrl } from "./ingest";
import { provideLive } from "./live";
import { ClipboardService, HudService, ToastService } from "./services";

const program = Effect.gen(function* () {
  const clipboard = yield* ClipboardService;
  const hud = yield* HudService;

  const clipboardText = yield* Effect.tryPromise({
    try: () => clipboard.readText(),
    catch: () => new EmptyClipboardError({ _tag: "EmptyClipboardError" }),
  });

  if (!clipboardText) {
    return yield* new EmptyClipboardError({ _tag: "EmptyClipboardError" });
  }

  const url = yield* validateUrl(clipboardText.trim());
  const result = yield* saveUrl(url);

  if (result.status === "duplicate") {
    yield* Effect.promise(() => hud.show(`⚠️ Already saved (${result.domain})`));
  } else {
    yield* Effect.promise(() => hud.show(`✅ Saved link from ${result.domain}`));
  }
});

export default async function SaveClipboardUrl() {
  await program.pipe(
    Effect.catchTags({
      EmptyClipboardError: () =>
        Effect.gen(function* () {
          const hud = yield* HudService;
          yield* Effect.promise(() => hud.show("❌ Clipboard is empty"));
        }),
      InvalidUrlError: () =>
        Effect.gen(function* () {
          const hud = yield* HudService;
          yield* Effect.promise(() => hud.show("❌ Clipboard doesn't contain a valid URL"));
        }),
      AuthError: () =>
        Effect.gen(function* () {
          const hud = yield* HudService;
          yield* Effect.promise(() => hud.show("❌ Failed to connect — try again"));
        }),
      ValidationError: ({ message }) =>
        Effect.gen(function* () {
          const hud = yield* HudService;
          yield* Effect.promise(() => hud.show(`❌ ${message}`));
        }),
      ServerError: ({ url, statusCode }) =>
        Effect.gen(function* () {
          const toast = yield* ToastService;
          yield* Effect.promise(() =>
            toast.showFailure("Server error", `Could not save link (${statusCode}). URL copied to clipboard.`, {
              title: "Copy URL",
              onAction: () => Clipboard.copy(url),
            }),
          );
        }),
      ConnectionError: ({ message }) =>
        Effect.gen(function* () {
          const toast = yield* ToastService;
          yield* Effect.promise(() => toast.showFailure("Connection error", message));
        }),
    }),
    provideLive,
    Effect.runPromise,
  );
}
