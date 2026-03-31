import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

type ManifestCommand = {
  name: string;
  title: string;
  mode: string;
};

type Manifest = {
  commands: ManifestCommand[];
};

function readManifest(): Manifest {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as Manifest;
}

test("package manifest exposes Peon Ping and one menu bar command", () => {
  const manifest = readManifest();

  expect(manifest.commands).toHaveLength(2);
  expect(manifest.commands).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "peon-ping",
        title: "Peon Ping",
        mode: "view",
      }),
      expect.objectContaining({
        name: "peon-ping-menu-bar",
        title: "Peon Ping Menu Bar",
        mode: "menu-bar",
      }),
    ]),
  );

  expect(
    manifest.commands.some((command) => command.name === "toggle-peon-ping"),
  ).toBe(false);
});
