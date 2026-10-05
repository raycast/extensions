import { expect, it } from "vitest";
import { convert } from "./convert.ts";
import {
  DEFAULT_SHORTCUTS,
  parseShortcut,
  validateShortcuts,
  durationSeconds,
  resolveShortcuts,
  preferenceName,
  SHORTCUT_ACTIONS,
} from "./user-settings.ts";
import { retimeSpring } from "./edit-duration.ts";
import { fromDuration } from "./model.ts";
import { previewKey } from "./preview-cache.ts";
import { readFileSync } from "node:fs";

it("preferences preserve legacy bindings, allow overrides and explicit disabling", () => {
  const legacy = {
    ...DEFAULT_SHORTCUTS,
    "copy:figma": "cmd+opt+f",
    "copy:swiftui": "",
  };
  expect(resolveShortcuts({}, legacy)).toEqual(legacy);
  expect(
    resolveShortcuts({ [preferenceName("copy:figma")]: "none" }, legacy)[
      "copy:figma"
    ],
  ).toBe("");
  expect(
    resolveShortcuts({ [preferenceName("copy:figma")]: "cmd+ctrl+f" }, legacy)[
      "copy:figma"
    ],
  ).toBe("cmd+ctrl+f");
  expect(() =>
    resolveShortcuts({ [preferenceName("copy:figma")]: "cmd+shift+6" }),
  ).toThrow("conflicts");
});
it("exposes all bindings as extension preferences without adding commands", () => {
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  expect(manifest.commands).toHaveLength(1);
  expect(manifest.preferences.map((p: { name: string }) => p.name)).toEqual(
    SHORTCUT_ACTIONS.map((a) => preferenceName(a.id)),
  );
});

it("defaults are unique and copy shortcuts remain tied to a format", () => {
  expect(validateShortcuts(DEFAULT_SHORTCUTS)).toEqual(DEFAULT_SHORTCUTS);
  for (const input of ["ease-out", ".spring(duration: 0.5, bounce: 0.6)"])
    for (const output of convert(input).outputs)
      expect(DEFAULT_SHORTCUTS).toHaveProperty(`copy:${output.id}`);
  expect(DEFAULT_SHORTCUTS["copy:swiftui"]).toBe("cmd+shift+6");
});
it("normalizes shortcuts, permits disabling and rejects conflicts and reserved keys", () => {
  expect(parseShortcut(" Shift + CMD + 3 ")).toEqual({
    modifiers: ["cmd", "shift"],
    key: "3",
  });
  expect(parseShortcut("")).toBeUndefined();
  expect(() =>
    validateShortcuts({ ...DEFAULT_SHORTCUTS, "copy:motion": "shift+cmd+3" }),
  ).toThrow("conflicts");
  for (const value of ["cmd+k", "cmd+cmd+3", "3", "shift+3", "cmd+banana"])
    expect(() => parseShortcut(value)).toThrow();
  expect(
    validateShortcuts({ ...DEFAULT_SHORTCUTS, "copy:motion": "" })[
      "copy:motion"
    ],
  ).toBe("");
});
it("validates duration as explicit whole milliseconds", () => {
  expect(durationSeconds("750")).toBe(0.75);
  for (const value of [
    "",
    "0",
    "-5",
    "Infinity",
    "500ms",
    "1e3",
    "500.5",
    "10001",
  ])
    expect(() => durationSeconds(value)).toThrow();
});
it("keeps duration consistent between supported curve exports", () => {
  for (const input of ["ease-out", "linear(0, 0.8 60%, 1)", "steps(3, end)"]) {
    const value = convert(input, 0.75);
    const code = (id: string) => value.outputs.find((o) => o.id === id)!.code!;
    expect(code("swiftui")).toContain("0.75");
    expect(code("motion")).toContain("duration: 0.75");
    expect(code("compose")).toContain("durationMillis = 750");
    expect(code("css-linear")).toContain("transition-duration: 0.75s");
    expect(code("tailwind")).toContain("duration-[0.75s]");
    expect(JSON.parse(code("dtcg")).duration.$value).toEqual({
      value: 0.75,
      unit: "s",
    });
    expect(value.easing).toEqual({ ...convert(input).easing, duration: 0.75 });
    if (input === "ease-out")
      expect(code("figma")).toBe(
        convert(input).outputs.find((o) => o.id === "figma")!.code,
      );
  }
});
it("retimes physical springs without discarding damping ratio, mass or velocity", () => {
  const original = { ...fromDuration(0.5, 0.6), mass: 2, initialVelocity: 3 };
  const edited = retimeSpring(original, 0.8);
  if (edited.kind !== "spring") throw new Error("Expected spring");
  expect(edited.omega0).toBeCloseTo((2 * Math.PI) / 0.8, 8);
  expect(edited.zeta).toBeCloseTo(original.zeta, 8);
  expect(edited.mass).toBe(2);
  expect(edited.initialVelocity).toBe(3);
  const spec = {
    easing: original,
    duration: 0.5,
    component: "Sheet" as const,
    appearance: "dark" as const,
  };
  expect(previewKey(spec)).not.toBe(previewKey({ ...spec, duration: 0.8 }));
});
