import { describe, expect, it, vi } from "vitest";
import { buildApiUrl, friendlyApiError, GearsetClient } from "../api";

describe("Gearset API URL construction", () => {
  it("encodes query parameters and repeated arrays", () => {
    expect(
      buildApiUrl("/public/reporting/deployments", {
        PipelineId: "pipeline id",
        EnvironmentIds: ["env-1", "env-2"],
      }),
    ).toBe(
      "https://api.gearset.com/public/reporting/deployments?PipelineId=pipeline+id&EnvironmentIds=env-1&EnvironmentIds=env-2",
    );
  });

  it("rejects unapproved API paths", () => {
    expect(() => buildApiUrl("https://evil.example/token")).toThrow("approved public endpoint");
  });
});

describe("Gearset API client", () => {
  it("uses token authorization without exposing the token in the URL", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ State: "Idle" }), { status: 200 }));
    const client = new GearsetClient("secret-value", fetchMock as typeof fetch);

    await expect(client.getCiJobStatus("11111111-1111-4111-8111-111111111111")).resolves.toEqual({ State: "Idle" });
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    const [url, options] = calls[0];
    expect(url).not.toContain("secret-value");
    expect((options?.headers as Record<string, string>).Authorization).toBe("token secret-value");
    expect((options?.headers as Record<string, string>)["api-version"]).toBe("1");
  });

  it("sends an empty JSON body when requesting a CI run", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ RunRequestId: "run-1" }), { status: 200 }));
    const client = new GearsetClient("token", fetchMock as typeof fetch);

    await client.startCiJob("11111111-1111-4111-8111-111111111111");

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(calls[0][1]?.method).toBe("POST");
    expect(calls[0][1]?.body).toBe("{}");
  });

  it("completes the Reporting API v3 operation flow", async () => {
    const responses = [
      { Status: "Running", OperationStatusId: "operation-status" },
      { Status: "Succeeded", OperationResultId: "operation-result" },
      { Deployments: [{ DeploymentId: "deployment-1", Status: "Successful" }] },
    ];
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(responses.shift()), { status: 200 }));
    const client = new GearsetClient("token", fetchMock as typeof fetch);

    await expect(
      client.getPipelineDeployments(
        "33333333-3333-4333-8333-333333333333",
        new Date("2026-07-01T00:00:00.000Z"),
        new Date("2026-07-10T00:00:00.000Z"),
      ),
    ).resolves.toEqual({ Deployments: [{ DeploymentId: "deployment-1", Status: "Successful" }] });

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(calls.map(([url]) => url)).toEqual([
      expect.stringContaining("/public/reporting/deployments?"),
      "https://api.gearset.com/public/operation/operation-status/status",
      "https://api.gearset.com/public/operation/operation-result/result",
    ]);
    expect(calls.every(([, options]) => (options?.headers as Record<string, string>)["api-version"] === "3")).toBe(
      true,
    );
  });

  it("returns authoritative Gearset error messages", () => {
    expect(friendlyApiError(403, { Message: "Reporting API is not enabled" })).toBe("Reporting API is not enabled");
    expect(friendlyApiError(429, undefined)).toContain("request limit");
  });

  it("loads all visible team deployments from the Audit API", async () => {
    const differences = Array.from({ length: 12 }, (_, index) => ({
      DifferenceType: "New",
      ObjectType: "ApexClass",
      DisplayName: `Class${index}`,
      ModifiedBy: "builder@example.com",
      ModifiedOn: "2026-07-09T12:00:00.000Z",
    }));
    const payload = {
      Deployments: [
        {
          DeploymentId: "deployment-1",
          Status: "Successful",
          FriendlyName: "Team deployment",
          Owner: "Builder",
          DeploymentDifferences: differences,
        },
      ],
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    const client = new GearsetClient("audit-token", fetchMock as typeof fetch);

    await expect(
      client.getTeamDeployments(new Date("2026-07-01T00:00:00.000Z"), new Date("2026-07-10T00:00:00.000Z")),
    ).resolves.toMatchObject({
      Deployments: [
        {
          DeploymentId: "deployment-1",
          Status: "Successful",
          FriendlyName: "Team deployment",
          Owner: "Builder",
          DeploymentDifferenceCount: 12,
          DeploymentDifferences: differences.slice(0, 10),
        },
      ],
    });

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(calls[0][0]).toBe(
      "https://api.gearset.com/public/audit/deployments?StartDate=2026-07-01T00%3A00%3A00.000Z&EndDate=2026-07-10T00%3A00%3A00.000Z",
    );
    expect((calls[0][1]?.headers as Record<string, string>)["api-version"]).toBe("1");
  });
});
