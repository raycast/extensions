/**
 * Tests for Raycast client info utility
 */

import { getClientInfo, clientInfoToQueryParams, getClientQueryString } from "../client-info";

import packageJson from "../../package.json";

// Get the expected version from package.json
const expectedVersion = packageJson.version;

describe("client-info", () => {
  describe("getClientInfo", () => {
    it("should return correct client info for production", () => {
      const clientInfo = getClientInfo("https://api.toneclone.ai");

      expect(clientInfo.name).toBe("raycast");
      expect(clientInfo.version).toBe(expectedVersion);
      expect(clientInfo.channel).toBe("raycast");
      expect(clientInfo.env).toBe("prod");
    });

    it("should detect development environment", () => {
      const clientInfo = getClientInfo("http://localhost:8080");

      expect(clientInfo.name).toBe("raycast");
      expect(clientInfo.version).toBe(expectedVersion);
      expect(clientInfo.channel).toBe("raycast");
      expect(clientInfo.env).toBe("dev");
    });

    it("should detect staging environment", () => {
      const clientInfo = getClientInfo("https://staging-api.toneclone.ai");

      expect(clientInfo.name).toBe("raycast");
      expect(clientInfo.version).toBe(expectedVersion);
      expect(clientInfo.channel).toBe("raycast");
      expect(clientInfo.env).toBe("staging");
    });

    it("should handle unknown environment", () => {
      const clientInfo = getClientInfo("https://custom-api.example.com");

      expect(clientInfo.name).toBe("raycast");
      expect(clientInfo.version).toBe(expectedVersion);
      expect(clientInfo.channel).toBe("raycast");
      expect(clientInfo.env).toBe("unknown");
    });
  });

  describe("clientInfoToQueryParams", () => {
    it("should convert client info to query parameters", () => {
      const clientInfo = {
        name: "raycast",
        version: expectedVersion,
        channel: "raycast",
        env: "prod",
      };

      const params = clientInfoToQueryParams(clientInfo);

      expect(params).toEqual({
        client: "raycast",
        client_version: expectedVersion,
        client_channel: "raycast",
        client_env: "prod",
      });
    });

    it("should handle empty values", () => {
      const clientInfo = {
        name: "raycast",
        version: "",
        channel: "",
        env: "",
      };

      const params = clientInfoToQueryParams(clientInfo);

      expect(params).toEqual({
        client: "raycast",
      });
    });
  });

  describe("getClientQueryString", () => {
    it("should return properly formatted query string", () => {
      const queryString = getClientQueryString("https://api.toneclone.ai");

      expect(queryString).toBe(
        `client=raycast&client_version=${expectedVersion}&client_channel=raycast&client_env=prod`,
      );
    });

    it("should handle development environment", () => {
      const queryString = getClientQueryString("http://localhost:8080");

      expect(queryString).toBe(
        `client=raycast&client_version=${expectedVersion}&client_channel=raycast&client_env=dev`,
      );
    });
  });
});
