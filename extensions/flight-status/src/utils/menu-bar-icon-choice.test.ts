import { describe, it, expect } from "vitest";
import { Icon, Color } from "@raycast/api";
import { resolveMenuBarIcon } from "./menu-bar-icon-choice";

const phaseIcon = { source: Icon.Airplane, tintColor: Color.Green };
const LOGO = "https://images.kiwi.com/airlines/64x64/VY.png";

describe("resolveMenuBarIcon", () => {
  it('"airline" uses the logo with the phase icon as fallback', () => {
    expect(resolveMenuBarIcon("airline", phaseIcon, LOGO, false)).toEqual({
      source: LOGO,
      fallback: Icon.Airplane,
    });
  });

  it('"airline" falls back to the phase icon when no logo is available', () => {
    expect(resolveMenuBarIcon("airline", phaseIcon, null, false)).toEqual(
      phaseIcon,
    );
  });

  it('"app" always uses the phase-aware icon, even with a logo', () => {
    expect(resolveMenuBarIcon("app", phaseIcon, LOGO, false)).toEqual(
      phaseIcon,
    );
  });

  it('"none" shows no icon', () => {
    expect(resolveMenuBarIcon("none", phaseIcon, LOGO, false)).toBeUndefined();
  });

  it('"none" still shows the phase icon when forced (empty title)', () => {
    expect(resolveMenuBarIcon("none", phaseIcon, LOGO, true)).toEqual(
      phaseIcon,
    );
  });
});
