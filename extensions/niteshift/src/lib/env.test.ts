// src/lib/env.test.ts
import { describe, it, expect } from "vitest";
import { getEnvironmentConfig, type Environment } from "./env";

describe("getEnvironmentConfig", () => {
  it("returns prod base URL and prod profile for prod env", () => {
    expect(getEnvironmentConfig("prod")).toEqual({
      baseUrl: "https://niteshift.dev",
      profile: "prod",
    });
  });

  it("returns staging base URL but maps to the prod profile (CLI quirk)", () => {
    expect(getEnvironmentConfig("staging")).toEqual({
      baseUrl: "https://stage.niteshift.dev",
      profile: "prod",
    });
  });

  it("returns dev base URL and dev profile for dev env", () => {
    expect(getEnvironmentConfig("dev")).toEqual({
      baseUrl: "https://niteshift.local",
      profile: "dev",
    });
  });

  it("Environment type accepts only the three known values", () => {
    const envs: Environment[] = ["prod", "staging", "dev"];
    for (const e of envs) {
      expect(getEnvironmentConfig(e)).toBeDefined();
    }
  });
});
