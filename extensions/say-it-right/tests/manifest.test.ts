import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
) as {
  commands: Array<{ name: string; title: string }>;
  preferences: Array<{ name: string; title: string }>;
};

function command(name: string) {
  const found = manifest.commands.find((entry) => entry.name === name);
  expect(found).toBeTruthy();
  return found!;
}

function preference(name: string) {
  const found = manifest.preferences.find((entry) => entry.name === name);
  expect(found).toBeTruthy();
  return found!;
}

describe("manifest product boundaries", () => {
  it("names standalone expression commands as spoken-English tasks", () => {
    expect(command("translate-selection").title).toBe("Say Selection in English");
    expect(command("translate-clipboard").title).toBe("Say Clipboard in English");
    expect(command("translate-intent").title).toBe("Say What I Mean");
  });

  it("keeps durable preferences aligned with coaching and voice defaults", () => {
    expect(preference("defaultAnalysisProvider").title).toBe("Default Coach Provider");
    expect(preference("ttsProvider").title).toBe("Default Voice Provider");
    expect(preference("translationTargetLanguage").title).toBe("Practice Translation Target");
  });
});
