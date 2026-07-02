import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(__dirname, "../src/convert-time.tsx"),
  "utf8",
);

describe("convert time grid UI", () => {
  it("does not render native Raycast captions under timezone card images", () => {
    expect(source).not.toContain("title={`${zone.time} in ${zone.label}`}");
    expect(source).not.toContain("subtitle={zone.date}");
  });

  it("uses the generated map ratio and fill behavior for the map grid item", () => {
    expect(source).toContain("TIMEZONE_MAP_ASPECT_RATIO");
    expect(source).toContain("aspectRatio={TIMEZONE_MAP_ASPECT_RATIO}");
    expect(source).toContain("fit={Grid.Fit.Fill}");
    expect(source).toContain('id="timezone-map"');
  });

  it("keeps the timezone card primary action focused on editing the clock", () => {
    expect(source).toContain('title="Edit Clock Time"');
    expect(source).toContain("Press Enter to edit this clock.");
  });

  it("uses a dedicated search-bar edit mode for a selected clock", () => {
    expect(source).toContain("Change time for ${editingClock.label}");
    expect(source).toContain("4:30 PM, 16:30, 15, 430pm, noon, midnight");
    expect(source).toContain("const searchModeKey = editingClock");
    expect(source).toContain("key={searchModeKey}");
    expect(source).toContain("setEditingClock({");
    expect(source).toContain("parseTimeForZone(");
    expect(source).toContain("trimmed,\n      editingClock.label");
    expect(source).toContain("anchorDate: editingClock.anchorDate");
    expect(source).toContain("baseline: { ...conversion, anchorDate: refDate }");
    expect(source).toContain("if (editHasTyped && !value.trim())");
  });

  it("switches the active edit target when another clock card is selected", () => {
    expect(source).toContain("onSelectionChange={handleSelectionChange}");
    expect(source).toContain("selectedItemId={selectedItemId}");
    expect(source).toContain("if (!editingClock) return;");
    expect(source).toContain("enterEditModeForZone(zone);");
    expect(source).not.toContain("showToast: false");
  });

  it("passes Raycast appearance into generated card and map SVGs", () => {
    expect(source).toContain("environment.appearance");
    expect(source).toContain("buildZoneCardSvg(zone, environment.appearance)");
    expect(source).toContain("buildTimezoneMapSvg(");
  });

  it("keeps a direct action for macOS timezone settings", () => {
    expect(source).toContain("SYSTEM_TIME_SETTINGS_TARGET");
    expect(source).toContain("Open System Timezone Settings");
    expect(source).toContain("/System/Library/PreferencePanes/DateAndTime.prefPane");
  });
});
