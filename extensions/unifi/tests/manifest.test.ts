import { describe, expect, it } from "vitest";
import manifest from "../package.json";

describe("first-run preferences", () => {
  it("requires a console address and API key without pre-filling either secret or host", () => {
    const preferences = new Map(manifest.preferences.map((preference) => [preference.name, preference]));
    const controller = preferences.get("controllerUrl");
    const apiKey = preferences.get("apiKey");

    expect(controller).toMatchObject({ required: true, type: "textfield" });
    expect(controller).not.toHaveProperty("default");
    expect(apiKey).toMatchObject({ required: true, type: "password" });
    expect(apiKey).not.toHaveProperty("default");
  });
});
