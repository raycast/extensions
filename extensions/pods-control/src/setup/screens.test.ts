import { expect, test } from "vitest";
import { cliSetup, installedCliSetup, outdatedCliSetup } from "../test/fixtures/cli-setup";
import { screenMarkdown, setupScreen } from "./screens";

const VERSION_NOTES = [
  "Could not determine the CLI version.",
  "This install is newer than the known release.",
  "Could not confirm the latest release.",
  "Using the saved **CLI Path**.",
];

function paragraphs(setup: ReturnType<typeof cliSetup>): string[] {
  return setupScreen(setup).body.split("\n\n");
}

test("lists version facts and omits the path when the CLI location is unknown", () => {
  // Given
  const setup = installedCliSetup({ cliPath: null });
  // When
  const [facts] = paragraphs(setup);
  // Then
  expect(facts).toBe("- **Version:** 0.5.0\n- **Install method:** Homebrew");
});

test("shows the latest release only on update screens", () => {
  // Given / When
  const upToDate = setupScreen(installedCliSetup());
  const update = setupScreen(outdatedCliSetup());
  // Then
  expect(upToDate.body).not.toContain("**Latest:**");
  expect(update.body).toContain("- **Latest:** 0.5.0");
});

test.each([
  {
    name: "an unknown version wins over a failed live check",
    setup: installedCliSetup({ latestVersion: null, versionStatus: "unknown", liveCheckFailed: true }),
    note: "Could not determine the CLI version.",
  },
  {
    name: "a newer install wins over a failed live check",
    // Detection would call this up to date; the status is forced so the update screen renders.
    setup: installedCliSetup({ installedVersion: "0.9.0", versionStatus: "update-available", liveCheckFailed: true }),
    note: "This install is newer than the known release.",
  },
  {
    name: "a failed live check wins over a saved CLI Path",
    setup: installedCliSetup({ liveCheckFailed: true, configuredCliPath: "/x" }),
    note: "Could not confirm the latest release.",
  },
  {
    name: "a saved CLI Path is mentioned last",
    setup: installedCliSetup({ configuredCliPath: "/x" }),
    note: "Using the saved **CLI Path**.",
  },
] as const)("shows a single version note when $name", ({ setup, note }) => {
  // When
  const body = setupScreen(setup).body;
  // Then
  const shown = VERSION_NOTES.filter((text) => body.includes(text));
  expect(shown).toEqual([note]);
});

test("never reports an unreadable version on the up-to-date screen", () => {
  // Given: detection never routes an unknown version here, so the guard must hold on the screen itself.
  const setup = installedCliSetup({ installedVersion: null, liveCheckFailed: true });
  // When
  const screen = setupScreen(setup);
  // Then
  expect(screen.title).toBe("pods-control CLI is up to date");
  expect(screen.body).toContain("- **Version:** unknown");
  expect(screen.body).not.toContain("Could not determine the CLI version.");
  expect(screen.body).toContain("Could not confirm the latest release.");
});

test("adds the minimum version note alongside the version note", () => {
  // Given
  const setup = outdatedCliSetup({ configuredCliPath: "/x" });
  // When
  const body = setupScreen(setup).body;
  // Then
  expect(body).toContain("Using the saved **CLI Path**.");
  expect(body).toMatch(/older than the minimum this extension requires \(\d+\.\d+\.\d+\)/);
});

test("skips the version and minimum notes when nothing needs attention", () => {
  // Given
  const setup = installedCliSetup();
  // When
  const body = paragraphs(setup);
  // Then
  expect(body).toHaveLength(1);
  expect(body[0]).toContain("- **Version:** 0.5.0");
  expect(body[0]).not.toContain("minimum");
});

test.each([
  { brewLinked: true, cause: "already linked", command: "brew link --overwrite raulgg/tap/pods-control" },
  { brewLinked: false, cause: "has not linked", command: "brew link raulgg/tap/pods-control" },
  { brewLinked: null, cause: "could not report", command: "brew link raulgg/tap/pods-control" },
] as const)("explains and fixes the link when brewLinked is $brewLinked", ({ brewLinked, cause, command }) => {
  // Given
  const setup = cliSetup({ state: "needs-link", brewCliPrefix: "/opt/homebrew/opt/pods-control", brewLinked });
  // When
  const screen = setupScreen(setup);
  // Then
  expect(screen.body).toContain(cause);
  expect(screen.body).toContain(`\`\`\`\n${command}\n\`\`\``);
  expect(screen.actions[0]?.[0]).toEqual({ type: "copy", title: "Copy Link Command", content: command });
});

test("names the keg CLI path only when Homebrew reports a prefix", () => {
  // Given
  const withPrefix = cliSetup({ state: "needs-reinstall", brewCliPrefix: "/opt/homebrew/opt/pods-control" });
  const withoutPrefix = cliSetup({ state: "needs-reinstall", brewCliPrefix: null });
  // When
  const named = setupScreen(withPrefix).body;
  const generic = setupScreen(withoutPrefix).body;
  // Then
  expect(named).toContain("`/opt/homebrew/opt/pods-control/bin/pods-control`");
  expect(generic).not.toContain("/bin/pods-control`");
  expect(generic).not.toContain("null");
});

test.each([
  { name: "a body", body: "Homebrew is not installed.", markdown: "# Install Homebrew\n\nHomebrew is not installed." },
  { name: "an empty body", body: "", markdown: "# Install Homebrew" },
])("renders the title as a heading above $name", ({ body, markdown }) => {
  // Given
  const screen = { title: "Install Homebrew", body, actions: [], isLoading: false };
  // When
  const result = screenMarkdown(screen);
  // Then
  expect(result).toBe(markdown);
});
