import { describe, expect, it } from "vitest";
import {
  buildMapFilename,
  buildMapDetailMarkdown,
  buildMapSignature,
  buildSvgDataUri,
  buildZoneCardFilename,
  buildZoneCardSvg,
  buildTimezoneMapSvg,
  formatOffsetLabel,
  getTimezoneOffsetMinutes,
  TIMEZONE_MAP_ASPECT_RATIO,
  type TimezoneBoundaryCollection,
} from "../src/map-preview";

const referenceDate = new Date("2026-07-01T12:00:00Z");

const zones = [
  {
    label: "SF",
    timezone: "America/Los_Angeles",
    time: "5:00 AM",
    date: "Wed, Jul 1",
    isSource: true,
    isTarget: false,
  },
  {
    label: "Bangkok",
    timezone: "Asia/Bangkok",
    time: "7:00 PM",
    date: "Wed, Jul 1",
    isSource: false,
    isTarget: true,
  },
  {
    label: "Budapest",
    timezone: "Europe/Budapest",
    time: "2:00 PM",
    date: "Wed, Jul 1",
    isSource: false,
    isTarget: false,
  },
];

const boundaryFixture: TimezoneBoundaryCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { tzid: "America/Los_Angeles" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-125, 32],
            [-114, 32],
            [-114, 42],
            [-125, 42],
            [-125, 32],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { tzid: "Asia/Bangkok" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [97, 5],
            [106, 5],
            [106, 21],
            [97, 21],
            [97, 5],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { tzid: "Europe/Budapest" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [16, 45],
            [23, 45],
            [23, 49],
            [16, 49],
            [16, 45],
          ],
        ],
      },
    },
  ],
};

describe("map preview", () => {
  it("formats UTC offsets with whole and half-hour offsets", () => {
    expect(formatOffsetLabel(0)).toBe("UTC");
    expect(formatOffsetLabel(-420)).toBe("UTC-7");
    expect(formatOffsetLabel(330)).toBe("UTC+5:30");
  });

  it("calculates timezone offsets for the reference moment", () => {
    expect(getTimezoneOffsetMinutes(referenceDate, "America/Los_Angeles")).toBe(
      -420,
    );
    expect(getTimezoneOffsetMinutes(referenceDate, "Asia/Bangkok")).toBe(420);
  });

  it("builds a static SVG map from real timezone boundary paths", () => {
    const svg = buildTimezoneMapSvg(zones, referenceDate, boundaryFixture);

    expect(svg).toContain("<svg");
    expect(svg).toContain('width="960" height="540"');
    expect(svg).toContain('viewBox="0 0 960 540"');
    expect(svg).toContain('data-tzid="America/Los_Angeles"');
    expect(svg).toContain('data-tzid="Asia/Bangkok"');
    expect(svg).toContain("SF");
    expect(svg).toContain("Bangkok");
    expect(svg).toContain("Budapest");
    expect(svg).not.toContain('fill="#E0F2FE"');
    expect(svg).not.toContain("TimeZoner timezone map");
    expect(svg).not.toContain("Real timezone boundaries");
    expect(svg).not.toContain("UTC offset bands");
    expect(svg).not.toContain("same UTC offset");
    expect(svg).not.toContain("M118 151");
    expect(svg).not.toContain("undefined");
  });

  it("exports the map aspect ratio used by the Raycast grid", () => {
    const svg = buildTimezoneMapSvg(zones, referenceDate, boundaryFixture);
    const dimensions = svg.match(
      /width="(?<width>\d+)" height="(?<height>\d+)"/,
    )?.groups;
    const width = Number(dimensions?.width);
    const height = Number(dimensions?.height);

    expect(dimensions).toEqual({ width: "960", height: "540" });
    expect(width / height).toBeCloseTo(16 / 9);
    expect(TIMEZONE_MAP_ASPECT_RATIO).toBe("16/9");
  });

  it("builds Raycast detail markdown around the generated map image", () => {
    const markdown = buildMapDetailMarkdown(
      "file:///tmp/timezoner-map.svg?raycast-width=720",
      zones[0],
      zones,
      referenceDate,
    );

    expect(markdown).toContain(
      "![Timezone map](file:///tmp/timezoner-map.svg?raycast-width=720)",
    );
    expect(markdown).not.toContain("Static boundary map");
    expect(markdown).not.toContain("| Zone |");
  });

  it("builds a stable signature for cache-busting detail images", () => {
    const svg = buildTimezoneMapSvg(zones, referenceDate);

    expect(buildMapSignature(svg)).toMatch(/^[a-z0-9]+$/);
    expect(buildMapSignature(svg)).toBe(buildMapSignature(svg));
  });

  it("uses the signature in the map filename to avoid stale Raycast image cache", () => {
    expect(buildMapFilename("abc123")).toBe("timezoner-map-abc123.svg");
  });

  it("builds a data URI for Raycast grid image content", () => {
    const dataUri = buildSvgDataUri("<svg>ok</svg>");

    expect(dataUri).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(Buffer.from(dataUri.split(",")[1], "base64").toString("utf8")).toBe(
      "<svg>ok</svg>",
    );
  });

  it("builds a compact timezone card SVG for grid display", () => {
    const svg = buildZoneCardSvg(zones[0]);

    expect(svg).toContain("<svg");
    expect(svg).toContain("SF");
    expect(svg).toContain("America/Los Angeles");
    expect(svg).toContain("5:00 AM");
    expect(svg).toContain("Wed, Jul 1");
    expect(svg).toContain("font-family=");
    expect(svg).toContain("SF Pro Display");
    expect(svg).not.toContain("undefined");
  });

  it("builds theme-aware card SVGs for Raycast light and dark appearances", () => {
    expect(buildZoneCardSvg(zones[0], "dark")).toContain('fill="#242422"');
    expect(buildZoneCardSvg(zones[0], "light")).toContain('fill="#FFFFFF"');
  });

  it("builds theme-aware map SVGs for Raycast light and dark appearances", () => {
    expect(
      buildTimezoneMapSvg(zones, referenceDate, boundaryFixture, "dark"),
    ).toContain('fill="#D97757"');
    expect(
      buildTimezoneMapSvg(zones, referenceDate, boundaryFixture, "light"),
    ).toContain('fill="#C85F3C"');
  });

  it("does not render a vertical accent strip on timezone cards", () => {
    const svg = buildZoneCardSvg(zones[0]);

    expect(svg).not.toContain('width="10" height="270"');
    expect(svg).not.toContain('height="270" fill="#D97757"');
  });

  it("highlights the source clock card with an orange border", () => {
    const svg = buildZoneCardSvg(zones[0]);

    expect(svg).toContain('stroke="#D97757"');
    expect(svg).toContain('stroke-width="3"');
  });

  it("fills the timezone card canvas so Raycast does not show a backing tile", () => {
    const svg = buildZoneCardSvg(zones[0]);

    expect(svg).toContain('width="480" height="270"');
    expect(svg).toContain('viewBox="0 0 480 270"');
    expect(svg).toContain('x="0" y="0" width="480" height="270"');
    expect(svg).not.toContain('x="1" y="1" width="358" height="178"');
  });

  it("uses the zone key and signature in card filenames", () => {
    expect(buildZoneCardFilename("America/Los_Angeles", "abc123")).toBe(
      "timezoner-card-america-los-angeles-abc123.svg",
    );
  });
});
