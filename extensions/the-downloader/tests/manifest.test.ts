import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The Raycast AI Model preference hands its value to AI.ask as an AI.Model, so
// every choice must be one of the installed API's current models. Read from the
// API's own typings: the runtime package isn't loaded in tests.

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const typings = fs.readFileSync(path.join(root, "node_modules/@raycast/api/types/index.d.ts"), "utf8");

/** `AI.Model` values, each with whether the typings mark it deprecated. */
function aiModels(): Map<string, boolean> {
  const start = typings.indexOf("enum Model {");
  // Up to the enum's own closing brace: the first line that is only "}".
  const end = start + typings.slice(start).search(/\n\s*}\s*\n/);
  const body = typings.slice(start, end);
  const models = new Map<string, boolean>();
  let deprecated = false;
  for (const line of body.split("\n")) {
    if (line.includes("@deprecated")) deprecated = true;
    const match = /^\s*"[^"]+"\s*=\s*"([^"]+)"/.exec(line);
    if (match) {
      // A value can appear under several names; it's current if any of them is.
      models.set(match[1], (models.get(match[1]) ?? true) && deprecated);
      deprecated = false;
    }
  }
  return models;
}

describe("Raycast AI Model preference", () => {
  const preference = manifest.commands
    .find((c: { name: string }) => c.name === "chat-link")
    .preferences.find((p: { name: string }) => p.name === "raycastModel");
  const choices: string[] = preference.data.map((d: { value: string }) => d.value).filter(Boolean);

  it("offers only current AI.Model values of the installed @raycast/api", () => {
    const models = aiModels();
    expect(models.size).toBeGreaterThan(10);
    for (const id of choices) {
      expect(models.has(id), `${id} is not an AI.Model`).toBe(true);
      expect(models.get(id), `${id} is deprecated`).toBe(false);
    }
  });

  it("keeps Raycast's default as the first choice", () => {
    expect(preference.data[0]).toMatchObject({ value: "" });
  });
});

describe("Checkbox preferences", () => {
  const checkboxes = [
    ...manifest.preferences,
    ...manifest.commands.flatMap((c: { preferences?: unknown[] }) => c.preferences ?? []),
  ].filter((p: { type: string }) => p.type === "checkbox") as { name: string; label: string }[];

  it("say what they turn on — Raycast for Windows shows the label, not the title", () => {
    expect(checkboxes.length).toBeGreaterThan(0);
    for (const { name, label } of checkboxes) {
      expect(label, name).not.toMatch(/^(enable|enabled|on)$/i);
    }
  });
});
