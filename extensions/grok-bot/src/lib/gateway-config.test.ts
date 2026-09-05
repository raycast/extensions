import { describe, expect, it } from "vitest";

import { mergeGatewayCredentials } from "./gateway-config";
import { err, ok } from "./types";

describe("mergeGatewayCredentials", () => {
  it("prefers Raycast preferences when both are set", () => {
    const result = mergeGatewayCredentials(
      { gatewayUrl: "https://from-raycast.ts.net", gatewayToken: "raycast-token" },
      ok({ gatewayUrl: "https://from-file.ts.net", gatewayToken: "file-token" }),
    );
    expect(result).toEqual({
      ok: true,
      value: { gatewayUrl: "https://from-raycast.ts.net", gatewayToken: "raycast-token" },
    });
  });

  it("uses the file when Raycast preferences are empty", () => {
    const result = mergeGatewayCredentials(
      { gatewayUrl: "", gatewayToken: "" },
      ok({ gatewayUrl: "https://from-file.ts.net", gatewayToken: "file-token" }),
    );
    expect(result).toEqual({
      ok: true,
      value: { gatewayUrl: "https://from-file.ts.net", gatewayToken: "file-token" },
    });
  });

  it("is not-configured when both Raycast prefs and the file are missing", () => {
    const result = mergeGatewayCredentials({ gatewayUrl: "", gatewayToken: "" }, err({ kind: "missing" }));
    expect(result).toEqual({ ok: false, error: { kind: "not-configured" } });
  });

  it("does not treat an unsafe file as not-configured", () => {
    const result = mergeGatewayCredentials({ gatewayUrl: "", gatewayToken: "" }, err({ kind: "insecure-permissions" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("credentials-file");
      if (result.error.kind === "credentials-file") {
        expect(result.error.detail).toContain("group or world readable");
      }
    }
  });
});
