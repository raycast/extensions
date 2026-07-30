import { describe, expect, it, vi } from "vitest";

import { extractReleaseYear, getModelYear, parseProductNameFromIoreg } from "../lib/model-year";
import { execf } from "../lib/exec";

vi.mock("../lib/exec", () => ({
  execf: vi.fn(),
}));

// Shaped like real `ioreg -ar -k product-name -d1` output: the matching object
// carries many other <data> properties before product-name — the parser must
// anchor to the key, not grab the first <data> in the document.
const IOREG_OUTPUT = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<array>
	<dict>
		<key>AAPL,phandle</key>
		<data>
		TQEAAA==
		</data>
		<key>IOObjectClass</key>
		<string>IOPlatformDevice</string>
		<key>RF-exposure-separation-distance</key>
		<data>
		BQAAAA==
		</data>
		<key>product-name</key>
		<data>
		TWFjQm9vayBQcm8gKDE2LWluY2gsIDIwMjEpAA==
		</data>
	</dict>
</array>
</plist>`;

describe("parseProductNameFromIoreg", () => {
  it("decodes the base64 product name and strips the trailing NUL", () => {
    expect(parseProductNameFromIoreg(IOREG_OUTPUT)).toBe("MacBook Pro (16-inch, 2021)");
  });

  it("returns null when no product-name data is present", () => {
    expect(parseProductNameFromIoreg("<plist><array/></plist>")).toBeNull();
    expect(parseProductNameFromIoreg("")).toBeNull();
  });
});

describe("extractReleaseYear", () => {
  it("pulls the year out of the marketing name", () => {
    expect(extractReleaseYear("MacBook Pro (16-inch, 2021)")).toBe("2021");
    expect(extractReleaseYear("MacBook Air (13-inch, M4, 2025)")).toBe("2025");
  });

  it("returns Unknown for missing or yearless names", () => {
    expect(extractReleaseYear(null)).toBe("Unknown");
    expect(extractReleaseYear("Mac Pro")).toBe("Unknown");
  });
});

describe("getModelYear", () => {
  it("reads the year from the device tree", async () => {
    vi.mocked(execf).mockResolvedValue(IOREG_OUTPUT);
    expect(await getModelYear()).toBe("2021");
  });

  it("returns Unknown when ioreg fails or the property is absent", async () => {
    vi.mocked(execf).mockRejectedValue(new Error("ioreg failed"));
    expect(await getModelYear()).toBe("Unknown");

    vi.mocked(execf).mockResolvedValue("<plist><array/></plist>");
    expect(await getModelYear()).toBe("Unknown");
  });
});
