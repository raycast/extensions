import { describe, expect, it } from "vitest";
import { buildRouteMapUrl } from "./route-map";

describe("buildRouteMapUrl", () => {
  it("builds a theme-aware route preview URL with Raycast dimensions", () => {
    expect(
      buildRouteMapUrl({
        apiBaseUrl: "https://api.withjumpseat.com",
        departureIata: "dub",
        arrivalIata: "DOH",
        theme: "dark",
      }),
    ).toBe(
      "https://api.withjumpseat.com/api/v1/route-maps/v1/dark/DOH/DUB.png?raycast-width=420&raycast-height=189&framing=compact",
    );
    expect(
      buildRouteMapUrl({
        apiBaseUrl: "https://api.withjumpseat.com",
        departureIata: "DOH",
        arrivalIata: "DUB",
        theme: "dark",
      }),
    ).toBe(
      "https://api.withjumpseat.com/api/v1/route-maps/v1/dark/DOH/DUB.png?raycast-width=420&raycast-height=189&framing=compact",
    );
  });

  it("does not render a route map without two distinct IATA codes", () => {
    expect(
      buildRouteMapUrl({
        apiBaseUrl: "https://api.withjumpseat.com",
        departureIata: "DUB",
        arrivalIata: null,
        theme: "light",
      }),
    ).toBeUndefined();
    expect(
      buildRouteMapUrl({
        apiBaseUrl: "https://api.withjumpseat.com",
        departureIata: "DUB",
        arrivalIata: "DUB",
        theme: "light",
      }),
    ).toBeUndefined();
  });
});
