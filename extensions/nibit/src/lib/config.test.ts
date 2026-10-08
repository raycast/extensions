import { describe, expect, it } from "vitest";

const PROD_CONFIG = {
  appBaseUrl: "https://app.nibit.app",
  supabaseUrl: "https://jzaibypvgxaheswvyjng.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6YWlieXB2Z3hhaGVzd3Z5am5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTY1OTgsImV4cCI6MjA4OTI3MjU5OH0.lJsCxplmYGqiOrKMn8CiteNM6aZQPLcV_vrLTyUSSq0",
  blobRelayUrl: "https://blob-relay.nibit.app",
  authBridgeUrl: "https://auth.nibit.app",
};

describe("getExtensionConfig", () => {
  it("returns production Raycast Store config", async () => {
    const { getExtensionConfig } = await import("./config");

    expect(getExtensionConfig()).toEqual(PROD_CONFIG);
  });
});
