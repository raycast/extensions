/**
 * Tests for API client client tracking integration
 */

import { getClientInfo, clientInfoToQueryParams } from "../client-info";

import packageJson from "../../package.json";

// Get the expected version from package.json
const expectedVersion = packageJson.version;

describe("API Client Client Tracking Integration", () => {
  it("should generate correct client info for production API", () => {
    const clientInfo = getClientInfo("https://api.toneclone.ai");
    const params = clientInfoToQueryParams(clientInfo);

    expect(params.client).toBe("raycast");
    expect(params.client_version).toBe(expectedVersion);
    expect(params.client_channel).toBe("raycast");
    expect(params.client_env).toBe("prod");
  });

  it("should generate correct client info for development API", () => {
    const clientInfo = getClientInfo("http://localhost:8080");
    const params = clientInfoToQueryParams(clientInfo);

    expect(params.client).toBe("raycast");
    expect(params.client_version).toBe(expectedVersion);
    expect(params.client_channel).toBe("raycast");
    expect(params.client_env).toBe("dev");
  });

  it("should generate correct client info for staging API", () => {
    const clientInfo = getClientInfo("https://staging-api.toneclone.ai");
    const params = clientInfoToQueryParams(clientInfo);

    expect(params.client).toBe("raycast");
    expect(params.client_version).toBe(expectedVersion);
    expect(params.client_channel).toBe("raycast");
    expect(params.client_env).toBe("staging");
  });

  it("should create valid query string format", () => {
    const clientInfo = getClientInfo("https://api.toneclone.ai");
    const params = clientInfoToQueryParams(clientInfo);
    const queryString = new URLSearchParams(params).toString();

    expect(queryString).toBe(`client=raycast&client_version=${expectedVersion}&client_channel=raycast&client_env=prod`);
  });

  it("should handle URL construction with existing query parameters", () => {
    const endpoint = "/personas?existing=param";
    const clientInfo = getClientInfo("https://api.toneclone.ai");
    const clientParams = new URLSearchParams({
      client: clientInfo.name,
      client_version: clientInfo.version,
      client_channel: clientInfo.channel,
      client_env: clientInfo.env,
    });

    const separator = endpoint.includes("?") ? "&" : "?";
    const fullUrl = `https://api.toneclone.ai${endpoint}${separator}${clientParams.toString()}`;

    expect(fullUrl).toContain("existing=param");
    expect(fullUrl).toContain("client=raycast");
    expect(fullUrl).toContain(`client_version=${expectedVersion}`);
    expect(fullUrl).toContain("client_channel=raycast");
    expect(fullUrl).toContain("client_env=prod");
  });

  it("should handle URL construction without existing query parameters", () => {
    const endpoint = "/personas";
    const clientInfo = getClientInfo("https://api.toneclone.ai");
    const clientParams = new URLSearchParams({
      client: clientInfo.name,
      client_version: clientInfo.version,
      client_channel: clientInfo.channel,
      client_env: clientInfo.env,
    });

    const separator = endpoint.includes("?") ? "&" : "?";
    const fullUrl = `https://api.toneclone.ai${endpoint}${separator}${clientParams.toString()}`;

    expect(fullUrl).toBe(
      `https://api.toneclone.ai/personas?client=raycast&client_version=${expectedVersion}&client_channel=raycast&client_env=prod`,
    );
  });
});
