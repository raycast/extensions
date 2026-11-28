import { Context, Effect, Layer, Schema } from "effect";
import { runInLocationApp } from "./location-app";

export class Location extends Schema.Class<Location>("Location")({
  latitude: Schema.Number,
  longitude: Schema.Number,
  accuracy: Schema.Number,
}) {}

const LocationJson = Schema.fromJsonString(Location);
/** Errors thrown by the Swift `currentLocation`, printed by their case name. */
const SwiftFailure = Schema.Literals(["denied", "timeout"]);

export class LocationError extends Schema.TaggedError<LocationError>()("LocationError", {
  reason: Schema.Literals(["denied", "timeout", "unknown"]),
  cause: Schema.Defect(),
}) {
  override get message(): string {
    switch (this.reason) {
      case "denied":
        return "Allow Raycast Geolocation in System Settings → Privacy & Security → Location Services";
      case "timeout":
        return "Could not determine your location in time";
      case "unknown":
        return this.cause instanceof Error ? this.cause.message : String(this.cause);
    }
  }
}

export class GeoLocation extends Context.Service<
  GeoLocation,
  {
    readonly current: Effect.Effect<Location, LocationError>;
  }
>()("geolocation/GeoLocation") {
  static readonly layer = Layer.succeed(
    GeoLocation,
    GeoLocation.of({
      current: runInLocationApp("currentLocation").pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(LocationJson)),
        Effect.catchTags({
          LocationAppError: (error) =>
            Effect.fail(
              new LocationError({
                reason: Schema.is(SwiftFailure)(error.output) ? error.output : "unknown",
                cause: error.cause,
              }),
            ),
          SchemaError: (cause) => Effect.fail(new LocationError({ reason: "unknown", cause })),
        }),
        Effect.withSpan("GeoLocation.current"),
      ),
    }),
  );
}

export type Format = Preferences["format"];

export const formatLocation = (location: Location, format: Format): string => {
  const lat = location.latitude.toFixed(5);
  const lon = location.longitude.toFixed(5);
  switch (format) {
    case "coordinates":
      return `${lat}, ${lon}`;
    case "google-maps":
      return `https://www.google.com/maps?q=${lat},${lon}`;
    case "apple-maps":
      return `https://maps.apple.com/?ll=${lat},${lon}&q=${lat},${lon}`;
    case "geo-uri":
      return `geo:${lat},${lon}`;
  }
};
