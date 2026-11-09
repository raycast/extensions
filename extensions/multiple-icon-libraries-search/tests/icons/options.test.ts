import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hudText, MAIN_ACTIONS, mainActionOrder, savedNotice } from "../../src/icons/actions";
import { setSavedKeywords } from "../../src/icons/stores";
import { shouldAskAi } from "../../src/icons/ai";
import { currentLibrary, enabledLibraries, LIBRARIES, LIBRARY_IDS, otherLibraries } from "../../src/icons/libraries";
import { strokeOverride, toPreview, withStrokeWidth } from "../../src/icons/svg";

describe("Enter Action", () => {
  it("puts the chosen action first and keeps the rest in the usual order", () => {
    expect(mainActionOrder("paste-name")).toEqual(MAIN_ACTIONS);
    expect(mainActionOrder("copy-react")).toEqual(["copy-react", "paste-name", "copy-svg", "copy-name", "paste-svg"]);
  });

  it("keeps the usual order for an unknown setting", () => {
    expect(mainActionOrder("dance")).toEqual(MAIN_ACTIONS);
    expect(mainActionOrder(undefined)).toEqual(MAIN_ACTIONS);
  });
});

describe("Stroke Width", () => {
  const hugeicons =
    '<svg width="24" height="24" fill="none"><path stroke="currentColor" stroke-width="1.5" d="M1"/><circle fill="currentColor" stroke-width="0"/></svg>';
  const lucide = '<svg width="24" height="24" stroke="currentColor" stroke-width="2"><path d="M1"/></svg>';

  it("sets every stroked line and leaves unstroked shapes alone", () => {
    expect(withStrokeWidth(hugeicons, "2.5")).toBe(
      '<svg width="24" height="24" fill="none"><path stroke="currentColor" stroke-width="2.5" d="M1"/><circle fill="currentColor" stroke-width="0"/></svg>',
    );
    expect(withStrokeWidth(lucide, "1")).toContain('stroke-width="1"');
  });

  it("leaves the library's default alone", () => {
    expect(withStrokeWidth(lucide, strokeOverride("default"))).toBe(lucide);
    expect(strokeOverride("7")).toBeUndefined();
    expect(strokeOverride("1.5")).toBe("1.5");
  });

  it("draws the preview large in a fixed color", () => {
    expect(toPreview(lucide, 256, "#fff")).toBe(
      '<svg width="256" height="256" stroke="#fff" stroke-width="2"><path d="M1"/></svg>',
    );
  });
});

describe("Automatic AI", () => {
  it("never runs on its own when the setting is off, but Tab still asks", () => {
    expect(shouldAskAi("smile", 0, false, false)).toBe("none");
    expect(shouldAskAi("smile", 0, true, false)).toBe("tab");
    expect(shouldAskAi("smile", 0, false)).toBe("auto");
  });
});

describe("Edit Keywords", () => {
  it("saves one phrase per line or comma, normalized and without repeats", () => {
    expect(setSavedKeywords({}, "smile", "Happy Face\nthe grin, happy face\n\n")).toEqual({
      smile: ["happy face", "grin"],
    });
  });

  it("forgets the icon when nothing is left", () => {
    expect(setSavedKeywords({ smile: ["grin"], other: ["x"] }, "smile", " \n")).toEqual({ other: ["x"] });
  });

  it("words the notice after an AI pick is remembered", () => {
    expect(savedNotice("happy face", "smile-dizzy")).toBe("“happy face” now finds smile-dizzy");
    expect(hudText("Copied SVG", "“grin” now finds smile")).toBe("Copied SVG · “grin” now finds smile");
    expect(hudText(undefined, undefined)).toBeUndefined();
  });
});

describe("Libraries", () => {
  it("lists the libraries turned on, in the usual order", () => {
    const all = Object.fromEntries(LIBRARY_IDS.map((id) => [LIBRARIES[id].setting, true]));
    expect(enabledLibraries(all).slice(0, 2)).toEqual(["lucide", "hugeicons"]);
    const onlyHuge = Object.fromEntries(LIBRARY_IDS.map((id) => [LIBRARIES[id].setting, id === "hugeicons"]));
    expect(enabledLibraries(onlyHuge)).toEqual(["hugeicons"]);
    const none = Object.fromEntries(LIBRARY_IDS.map((id) => [LIBRARIES[id].setting, false]));
    expect(enabledLibraries(none)).toEqual([]);
  });

  it("counts a switch the settings don't mention as on", () => {
    expect(enabledLibraries({})).toEqual(LIBRARY_IDS);
  });

  it("has a switch in the command's settings for every library, each on by default", () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8"));
    const command = manifest.commands.find((entry: { name: string }) => entry.name === "search-icons");
    const switches = command.preferences.filter((pref: { name: string }) => pref.name.startsWith("library"));
    const on = Object.fromEntries(
      switches.map((pref: { name: string; default: boolean }) => [pref.name, pref.default]),
    );
    const off = Object.fromEntries(switches.map((pref: { name: string }) => [pref.name, false]));
    expect(enabledLibraries(on)).toEqual(LIBRARY_IDS);
    expect(enabledLibraries(off)).toEqual([]);
  });

  it("opens on the Default Library, then the last one used, skipping libraries that are off", () => {
    expect(currentLibrary(["hugeicons", "lucide"], ["lucide", "hugeicons"])).toBe("hugeicons");
    expect(currentLibrary([undefined, "hugeicons"], ["lucide", "hugeicons"])).toBe("hugeicons");
    expect(currentLibrary(["hugeicons", "lucide"], ["lucide"])).toBe("lucide");
    expect(currentLibrary([undefined, "hugeicons"], ["lucide"])).toBe("lucide");
    expect(currentLibrary(["last", "retired-library"], ["hugeicons"])).toBe("hugeicons");
    expect(currentLibrary(["lucide"], [])).toBeUndefined();
  });

  it("offers every other library that is on for ⌘L", () => {
    expect(otherLibraries(["lucide", "hugeicons"], "lucide")).toEqual(["hugeicons"]);
    expect(otherLibraries(["lucide"], "lucide")).toEqual([]);
  });
});
