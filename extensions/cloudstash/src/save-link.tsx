import { Clipboard, LaunchProps } from "@raycast/api";
import { Effect } from "effect";

import { saveUrl, validateUrl } from "./ingest";
import { provideLive } from "./live";
import { HudService, ToastService } from "./services";

const program = (url: string) =>
  Effect.gen(function* () {
    const hud = yield* HudService;
    const validUrl = yield* validateUrl(url);
    const result = yield* saveUrl(validUrl);

    if (result.status === "duplicate") {
      yield* Effect.promise(() => hud.show(`⚠️ Already saved (${result.domain})`));
    } else {
      yield* Effect.promise(() => hud.show(`✅ Saved link from ${result.domain}`));
    }
  });

export default async function SaveLink(props: LaunchProps<{ arguments: Arguments.SaveLink }>) {
  await program(props.arguments.url.trim()).pipe(
    Effect.catchTags({
      InvalidUrlError: () =>
        Effect.gen(function* () {
          const hud = yield* HudService;
          yield* Effect.promise(() => hud.show("❌ Not a valid URL"));
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
