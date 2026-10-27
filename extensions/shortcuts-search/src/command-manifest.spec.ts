import manifest from "../package.json";

describe("Raycast command manifest", () => {
  it("declares both supported platforms", () => {
    expect(manifest.platforms).toEqual(["macOS", "Windows"]);
  });
  it("keeps personal data inside the existing public commands", () => {
    expect(manifest.commands.map((command) => command.name)).toEqual([
      "all-shortcuts",
      "app-shortcuts",
      "web-shortcuts",
      "current-app",
    ]);
  });
});
