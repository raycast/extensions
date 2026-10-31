import { expect, test } from "vitest";
import manifest from "../../package.json";

test("exposes each command with its required execution mode", () => {
  // Given
  const expectedModes = {
    "set-noise-cancellation": "no-view",
    "set-transparency": "no-view",
    "set-adaptive": "no-view",
    "set-off": "no-view",
    "cycle-listening-mode": "no-view",
    "toggle-conversation-awareness": "no-view",
    "pods-status": "no-view",
    "manage-cli": "view",
  };

  // When
  const modes = Object.fromEntries(manifest.commands.map(({ name, mode }) => [name, mode]));

  // Then
  expect(modes).toEqual(expectedModes);
  expect(manifest.commands).toHaveLength(Object.keys(expectedModes).length);
});

test("schedules status refresh while leaving direct controls unscheduled", () => {
  // Given
  const commands: Array<{ name: string; interval?: string; subtitle?: string }> = manifest.commands;

  // When
  const refresh = commands.find(({ name }) => name === "pods-status");
  const directControls = commands.filter(({ name }) =>
    ["cycle-listening-mode", "toggle-conversation-awareness"].includes(name),
  );

  // Then
  expect(refresh).toMatchObject({ interval: "1m" });
  expect(refresh?.subtitle).toBeUndefined();
  expect(directControls).toHaveLength(2);
  for (const command of commands) {
    expect(command.subtitle).toBeUndefined();
  }
  for (const command of directControls) {
    expect(command.interval).toBeUndefined();
  }
});

test("lists cycle preferences in device order with the current defaults", () => {
  // Given
  const command = manifest.commands.find((entry) => entry.name === "cycle-listening-mode");
  const preferences = command && "preferences" in command ? command.preferences : undefined;

  // When
  const listed = preferences?.map(({ name, label, title, default: enabledByDefault }) => ({
    name,
    label,
    title: title ?? null,
    default: enabledByDefault,
  }));

  // Then
  expect(listed).toEqual([
    { name: "cycleOff", label: "Off", title: "Modes to Cycle Through", default: false },
    { name: "cycleTransparency", label: "Transparency", title: null, default: true },
    { name: "cycleAdaptive", label: "Adaptive", title: null, default: false },
    { name: "cycleAnc", label: "Noise Cancellation", title: null, default: true },
  ]);
});

test("indexes CLI aliases on the commands that accept them", () => {
  // Given
  const aliasesByCommand = {
    "set-noise-cancellation": ["lm", "anc", "nc"],
    "set-transparency": ["lm", "trans"],
    "set-adaptive": ["lm", "auto", "automatic"],
    "set-off": ["lm"],
    "cycle-listening-mode": ["lm", "anc", "nc", "trans"],
    "toggle-conversation-awareness": ["ca"],
    "pods-status": ["lm", "ca"],
  };

  // When
  const keywordsByCommand = Object.fromEntries(manifest.commands.map(({ name, keywords }) => [name, keywords]));

  // Then
  expect(manifest.keywords.length).toBeLessThanOrEqual(12);
  for (const [name, aliases] of Object.entries(aliasesByCommand)) {
    expect(keywordsByCommand[name]).toEqual(expect.arrayContaining(aliases));
  }
  for (const command of manifest.commands) {
    expect(command.keywords.length).toBeLessThanOrEqual(12);
  }
});
