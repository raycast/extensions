import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  environment: { supportPath: "/private/standing-desk-support" },
}));

import { sanitizeDiagnosticText } from "./diagnostics";

describe("diagnostic log redaction", () => {
  it("redacts support paths and Bluetooth identifiers", () => {
    const text = sanitizeDiagnosticText(
      "Failed at /private/standing-desk-support/movement.lock for 550E8400-E29B-41D4-A716-446655440000",
    );

    expect(text).toBe(
      "Failed at [support-path]/movement.lock for [desk-identifier]",
    );
  });
});
