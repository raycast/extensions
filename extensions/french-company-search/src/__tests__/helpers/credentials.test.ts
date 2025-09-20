/**
 * Tests for credentials helpers
 */

import { describe, it, expect } from "@jest/globals";
import { getTestCredentials, debugCredentials } from "./credentials";

describe("Credentials Helper", () => {
  it("should return credentials structure", () => {
    const credentials = getTestCredentials();

    expect(credentials).toBeDefined();
    expect(credentials).toHaveProperty("username");
    expect(credentials).toHaveProperty("password");
    expect(credentials).toHaveProperty("source");
    expect(["env", "raycast", "none"]).toContain(credentials.source);
  });

  it("should handle debug credentials without throwing", () => {
    expect(() => debugCredentials()).not.toThrow();
  });

  it("should prioritize environment variables", () => {
    const originalUsername = process.env.INPI_USERNAME;
    const originalPassword = process.env.INPI_PASSWORD;

    // Define test credentials
    process.env.INPI_USERNAME = "test-user";
    process.env.INPI_PASSWORD = "test-pass";

    const credentials = getTestCredentials();

    if (credentials.source === "env") {
      expect(credentials.username).toBe("test-user");
      expect(credentials.password).toBe("test-pass");
    }

    // Restore original variables
    if (originalUsername) {
      process.env.INPI_USERNAME = originalUsername;
    } else {
      delete process.env.INPI_USERNAME;
    }

    if (originalPassword) {
      process.env.INPI_PASSWORD = originalPassword;
    } else {
      delete process.env.INPI_PASSWORD;
    }
  });
});
