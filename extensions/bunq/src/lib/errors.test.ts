import { describe, it, expect } from "vitest";
import { getErrorMessage, isBunqApiError, isAuthenticationError } from "./errors";
import { BunqApiError } from "../api/client";

describe("errors", () => {
  describe("getErrorMessage", () => {
    it("extracts message from BunqApiError", () => {
      const error = new BunqApiError("Insufficient funds", 400, [
        { error_description: "Insufficient funds", error_description_translated: "Insufficient funds" },
      ]);

      expect(getErrorMessage(error)).toBe("Insufficient funds");
    });

    it("extracts message from standard Error", () => {
      const error = new Error("Network timeout");

      expect(getErrorMessage(error)).toBe("Network timeout");
    });

    it("returns 'Unknown error' for undefined", () => {
      expect(getErrorMessage(undefined)).toBe("Unknown error");
    });

    it("returns 'Unknown error' for null", () => {
      expect(getErrorMessage(null)).toBe("Unknown error");
    });

    it("returns 'Unknown error' for string", () => {
      expect(getErrorMessage("some error string")).toBe("Unknown error");
    });

    it("returns 'Unknown error' for number", () => {
      expect(getErrorMessage(42)).toBe("Unknown error");
    });

    it("returns 'Unknown error' for plain object", () => {
      expect(getErrorMessage({ message: "error" })).toBe("Unknown error");
    });
  });

  describe("isBunqApiError", () => {
    it("returns true for BunqApiError", () => {
      const error = new BunqApiError("API error", 500, []);

      expect(isBunqApiError(error)).toBe(true);
    });

    it("returns false for standard Error", () => {
      const error = new Error("Standard error");

      expect(isBunqApiError(error)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isBunqApiError(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isBunqApiError(undefined)).toBe(false);
    });

    it("returns false for plain object", () => {
      expect(isBunqApiError({ statusCode: 400, message: "error" })).toBe(false);
    });
  });

  describe("isAuthenticationError", () => {
    it("returns true for 401 BunqApiError", () => {
      const error = new BunqApiError("Unauthorized", 401, [
        { error_description: "Unauthorized", error_description_translated: "Unauthorized" },
      ]);

      expect(isAuthenticationError(error)).toBe(true);
    });

    it("returns false for non-401 BunqApiError", () => {
      const error400 = new BunqApiError("Bad request", 400, []);
      const error403 = new BunqApiError("Forbidden", 403, []);
      const error500 = new BunqApiError("Server error", 500, []);

      expect(isAuthenticationError(error400)).toBe(false);
      expect(isAuthenticationError(error403)).toBe(false);
      expect(isAuthenticationError(error500)).toBe(false);
    });

    it("returns false for standard Error", () => {
      const error = new Error("Unauthorized");

      expect(isAuthenticationError(error)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isAuthenticationError(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isAuthenticationError(undefined)).toBe(false);
    });
  });
});
