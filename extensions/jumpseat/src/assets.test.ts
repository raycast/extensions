import { describe, expect, it } from "vitest";
import { trustedJumpseatAssetUrl } from "./assets";

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
});
