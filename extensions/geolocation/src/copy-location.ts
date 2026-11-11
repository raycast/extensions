import { Clipboard, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Cause, Effect } from "effect";
import { formatLocation, GeoLocation } from "./location";

const copyLocation = Effect.gen(function* () {
  const { format } = getPreferenceValues<Preferences.CopyLocation>();
  const geo = yield* GeoLocation;

  yield* Effect.tryPromise(() => showToast({ style: Toast.Style.Animated, title: "Locating…" }));
  const location = yield* geo.current;
  const text = formatLocation(location, format);

  yield* Effect.tryPromise(() => Clipboard.copy(text));
  yield* Effect.tryPromise(() => showHUD(`Copied ${text}`));
}).pipe(
  Effect.catchTag("LocationError", (error) =>
    Effect.promise(() => showFailureToast(error.message, { title: "Failed to get location" })),
  ),
  Effect.catchCause((cause) =>
    Effect.promise(() => showFailureToast(Cause.squash(cause), { title: "Failed to copy location" })),
  ),
  Effect.provide(GeoLocation.layer),
);

export default async function Command() {
  await Effect.runPromise(copyLocation);
}
