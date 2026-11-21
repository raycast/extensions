import { describe, expect, it } from "vitest";
import {
  buildApiUrl,
  getApiBasePath,
  getAppBaseUrl,
  normalizeApiBasePath,
  normalizeAppBaseUrl,
  normalizeWorkspaceSlug,
} from "../src/helpers/urls";
import { preferences } from "./mocks/raycast-api";

describe("normalizeApiBasePath", () => {
  it.each([
    ["https://plane.example.com/", "https://plane.example.com"],
    ["https://plane.example.com///", "https://plane.example.com"],
    ["  https://plane.example.com  ", "https://plane.example.com"],
    ["https://plane.example.com/api", "https://plane.example.com"],
    ["https://plane.example.com/api/", "https://plane.example.com"],
    ["https://plane.example.com/api/v1/", "https://plane.example.com"],
    ["https://plane.example.com/plane/api/v1", "https://plane.example.com/plane"],
    ["plane.example.com", "https://plane.example.com"],
    ["", "https://api.plane.so"],
    [undefined, "https://api.plane.so"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeApiBasePath(input)).toBe(expected);
  });
});

describe("normalizeAppBaseUrl", () => {
  it("trims and strips trailing slashes", () => {
    expect(normalizeAppBaseUrl(" https://tasks.example.net/ ")).toBe("https://tasks.example.net");
  });
  it("falls back to Plane Cloud", () => {
    expect(normalizeAppBaseUrl("")).toBe("https://app.plane.so");
  });
});

describe("buildApiUrl", () => {
  it("never produces a double slash (the trailing-slash 404 bug)", () => {
    expect(buildApiUrl("https://plane.example.com/", "workspaces/acme/projects")).toBe(
      "https://plane.example.com/api/v1/workspaces/acme/projects/",
    );
  });
  it("adds non-empty query params", () => {
    expect(
      buildApiUrl("https://api.plane.so", "/users/me/", { expand: "state", cursor: undefined, per_page: 100 }),
    ).toBe("https://api.plane.so/api/v1/users/me/?expand=state&per_page=100");
  });
});

describe("preference getters", () => {
  it("normalize the stored preferences", () => {
    preferences.API_BASE_PATH = "https://tasks.example.net/";
    preferences.APP_BASE_URL = "https://tasks.example.net/";
    expect(getApiBasePath()).toBe("https://tasks.example.net");
    expect(getAppBaseUrl()).toBe("https://tasks.example.net");
  });
});

describe("normalizeWorkspaceSlug", () => {
  it.each([
    ["acme", "acme"],
    [" acme/ ", "acme"],
    ["https://app.plane.so/acme/projects/123", "acme"],
    ["", ""],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeWorkspaceSlug(input)).toBe(expected);
  });
});
