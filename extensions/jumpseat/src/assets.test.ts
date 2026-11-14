import { describe, expect, it } from "vitest";
import {
  trustedAirlineLogoSource,
  trustedAirlineMenuBarLogoSource,
  trustedJumpseatAssetUrl,
  trustedProfilePictureUrl,
} from "./assets";

describe("trusted Jumpseat asset URLs", () => {
  it("accepts versioned airline logos and country flags from the Jumpseat CDN", () => {
    expect(
      trustedJumpseatAssetUrl(
        "https://cdn.withjumpseat.com/airline-logos/EIN/light.svg?v=1234",
        "airline-logo",
      ),
    ).toBe("https://cdn.withjumpseat.com/airline-logos/EIN/light.svg?v=1234");
    expect(
      trustedJumpseatAssetUrl(
        "https://cdn.withjumpseat.com/country-flags/IE.svg",
        "country-flag",
      ),
    ).toBe("https://cdn.withjumpseat.com/country-flags/IE.svg");
  });

  it("rejects arbitrary hosts, insecure URLs, credentials, and unexpected paths", () => {
    expect(
      trustedJumpseatAssetUrl(
        "https://example.com/airline-logos/EIN/light.svg",
        "airline-logo",
      ),
    ).toBeUndefined();
    expect(
      trustedJumpseatAssetUrl(
        "http://cdn.withjumpseat.com/country-flags/IE.svg",
        "country-flag",
      ),
    ).toBeUndefined();
    expect(
      trustedJumpseatAssetUrl(
        "https://user:secret@cdn.withjumpseat.com/country-flags/IE.svg",
        "country-flag",
      ),
    ).toBeUndefined();
    expect(
      trustedJumpseatAssetUrl(
        "https://cdn.withjumpseat.com/aircraft-images/plain/359.png",
        "airline-logo",
      ),
    ).toBeUndefined();
  });

  it("does not allow an asset kind to use another kind's path", () => {
    expect(
      trustedJumpseatAssetUrl(
        "https://cdn.withjumpseat.com/country-flags/IE.svg",
        "airline-logo",
      ),
    ).toBeUndefined();
  });

  it("accepts secure profile pictures and rejects unsafe image URLs", () => {
    expect(
      trustedProfilePictureUrl(
        "https://api.withjumpseat.com/api/v1/media/profile-pictures/profile-pictures/friend/avatar-thumb.webp",
      ),
    ).toBe(
      "https://api.withjumpseat.com/api/v1/media/profile-pictures/profile-pictures/friend/avatar-thumb.webp",
    );
    expect(
      trustedProfilePictureUrl("http://example.com/avatar.png"),
    ).toBeUndefined();
    expect(
      trustedProfilePictureUrl("https://user:secret@example.com/avatar.png"),
    ).toBeUndefined();
    expect(
      trustedProfilePictureUrl("https://example.com/avatar.png"),
    ).toBeUndefined();
    expect(
      trustedProfilePictureUrl(
        "https://api.withjumpseat.com:8443/api/v1/media/profile-pictures/profile-pictures/friend/avatar-thumb.webp",
      ),
    ).toBeUndefined();
    expect(
      trustedProfilePictureUrl(
        "https://api.withjumpseat.com/api/v1/media/posts/post/image.webp",
      ),
    ).toBeUndefined();
  });
});

describe("trusted airline logo source", () => {
  const light =
    "https://cdn.withjumpseat.com/airline-logos/DLH/light.svg?v=1234";
  const dark = "https://cdn.withjumpseat.com/airline-logos/DLH/dark.svg?v=1234";

  it("uses the dark variant for dark appearance", () => {
    expect(
      trustedAirlineLogoSource({ logoUrl: light, logoDarkUrl: dark }),
    ).toEqual({ light, dark });
  });

  it("falls back to whichever trusted variant is available", () => {
    expect(trustedAirlineLogoSource({ logoUrl: light })).toEqual({
      light,
      dark: light,
    });
    expect(
      trustedAirlineLogoSource({
        logoUrl: "https://example.com/airline-logos/DLH/light.svg",
        logoDarkUrl: dark,
      }),
    ).toEqual({ light: dark, dark });
    expect(
      trustedAirlineLogoSource({ logoUrl: null, logoDarkUrl: null }),
    ).toBeUndefined();
  });
});

describe("trusted airline menu bar logo source", () => {
  it("uses the CDN PNG for each trusted SVG variant", () => {
    expect(
      trustedAirlineMenuBarLogoSource({
        logoUrl:
          "https://cdn.withjumpseat.com/airline-logos/QTR/light.svg?v=1234",
        logoDarkUrl:
          "https://cdn.withjumpseat.com/airline-logos/QTR/dark.svg?v=1234",
      }),
    ).toEqual({
      light: "https://cdn.withjumpseat.com/airline-logos/QTR/light.png?v=1234",
      dark: "https://cdn.withjumpseat.com/airline-logos/QTR/dark.png?v=1234",
    });
  });

  it("does not derive PNGs from untrusted URLs", () => {
    expect(
      trustedAirlineMenuBarLogoSource({
        logoUrl: "https://example.com/airline-logos/QTR/light.svg",
      }),
    ).toBeUndefined();
  });
});
