import { vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({
    apiToken: "test-token",
  })),
}));

import { describe, expect, it } from "vitest";
import { buildStatusPageUrl, toStatusPage } from "@/api/betterstack-status-pages-api";
import { StatusPageState } from "@/domain/status-page";

describe("buildStatusPageUrl", () => {
  it("uses the custom domain when one is set", () => {
    const url = buildStatusPageUrl({
      id: "1",
      name: "Acme",
      subdomain: "acme",
      customDomain: "status.acme.com",
      state: StatusPageState.OPERATIONAL,
    });

    expect(url).toBe("https://status.acme.com");
  });

  it("falls back to the betteruptime.com subdomain when no custom domain is set", () => {
    const url = buildStatusPageUrl({
      id: "1",
      name: "Acme",
      subdomain: "acme",
      customDomain: undefined,
      state: StatusPageState.OPERATIONAL,
    });

    expect(url).toBe("https://acme.betteruptime.com");
  });
});

describe("toStatusPage", () => {
  it("maps known attributes", () => {
    const statusPage = toStatusPage({
      id: "42",
      type: "status_page",
      attributes: {
        company_name: "Acme Inc",
        subdomain: "acme",
        custom_domain: "status.acme.com",
        aggregate_state: "degraded",
      },
    });

    expect(statusPage).toEqual({
      id: "42",
      name: "Acme Inc",
      subdomain: "acme",
      customDomain: "status.acme.com",
      state: StatusPageState.DEGRADED,
    });
  });

  it("falls back to the subdomain as the name when company_name is missing", () => {
    const statusPage = toStatusPage({
      id: "42",
      type: "status_page",
      attributes: { subdomain: "acme", aggregate_state: "operational" },
    });

    expect(statusPage.name).toBe("acme");
  });

  it("falls back to Operational for an unrecognized state", () => {
    const statusPage = toStatusPage({
      id: "42",
      type: "status_page",
      attributes: { subdomain: "acme", aggregate_state: "something-new" },
    });

    expect(statusPage.state).toBe(StatusPageState.OPERATIONAL);
  });
});
