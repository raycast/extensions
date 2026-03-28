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

test("package manifest exposes only one menu bar command", () => {
  const manifest = readManifest();
  expect(manifest.commands).toHaveLength(2);

  const menuBarCommands = manifest.commands.filter(
    (command) =>
      command.mode === "menu-bar" ||
      command.title.toLowerCase().includes("menu bar"),
  );

  expect(menuBarCommands).toHaveLength(1);
  expect(menuBarCommands[0]).toMatchObject({
    name: "peon-ping-menu-bar",
    title: "Peon Ping Menu Bar",
    mode: "menu-bar",
  });

  expect(manifest.commands).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "toggle-peon-ping",
        title: "Toggle Peon Ping",
        mode: "no-view",
      }),
    ]),
  );
});
