import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Command = { name: string; title: string };

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  commands: Command[];
};

describe("command manifest", () => {
  it("exposes one combined Pause or Resume command", () => {
    expect(manifest.commands.find((command) => command.name === "manage-applications")).toMatchObject({
      name: "manage-applications",
      title: "Pause or Resume App",
    });
    expect(manifest.commands.map((command) => command.name)).not.toContain("pause-app");
    expect(manifest.commands.map((command) => command.name)).not.toContain("resume-app");
  });
});
