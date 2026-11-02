import { Clipboard, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { Effect } from "effect";
import { formatLocation, GeoLocation } from "./location";

const copyLocation = Effect.gen(function* () {
  const { format } = getPreferenceValues<Preferences.CopyLocation>();
  const geo = yield* GeoLocation;

  yield* Effect.promise(() => showToast({ style: Toast.Style.Animated, title: "Locating…" }));
  const location = yield* geo.current;
  const text = formatLocation(location, format);

  yield* Effect.promise(() => Clipboard.copy(text));
  yield* Effect.promise(() => showHUD(`Copied ${text} (±${Math.round(location.accuracy)} m)`));
}).pipe(
  Effect.catchTag("LocationError", (error) =>
    Effect.promise(() =>
      showToast({ style: Toast.Style.Failure, title: "Failed to get location", message: error.message }),
    ),
  ),
  Effect.provide(GeoLocation.layer),
);

export default async function Command() {
  await Effect.runPromise(copyLocation);
}
