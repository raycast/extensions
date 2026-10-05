import { afterEach, describe, expect, it, vi } from "vitest";

import { outagedeckAdapter } from "@/adapters/outagedeck";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("outagedeckAdapter", () => {
  it("detects provider page and API URLs without matching other pages", async () => {
    await expect(
      outagedeckAdapter.detect?.("https://outagedeck.com/providers/github"),
    ).resolves.toBe(true);
    await expect(
      outagedeckAdapter.detect?.(
        "https://outagedeck.com/api/v1/providers/github",
      ),
    ).resolves.toBe(true);
    await expect(
      outagedeckAdapter.detect?.("https://outagedeck.com/developers/api"),
    ).resolves.toBe(false);
    await expect(
      outagedeckAdapter.detect?.(
        "https://outagedeck.com/providers/github/actions",
      ),
    ).resolves.toBe(false);
    await expect(
      outagedeckAdapter.detect?.(
        "https://outagedeck.com/api/v1/providers/github/incidents",
      ),
    ).resolves.toBe(false);
    await expect(
      outagedeckAdapter.detect?.(
        "https://outagedeck.com/providers/github%2Factions",
      ),
    ).resolves.toBe(false);
    await expect(
      outagedeckAdapter.detect?.(
        "https://outagedeck.com/api/v1/providers/github%5Cactions",
      ),
    ).resolves.toBe(false);
    await expect(
      outagedeckAdapter.detect?.("https://status.example.com/providers/github"),
    ).resolves.toBe(false);
  });

  it("maps provider status, components, and active incidents", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "provider_github",
            slug: "github",
            name: "GitHub",
            currentStatus: {
              code: "partial_outage",
              label: "Partial Outage",
              headline: "GitHub is experiencing a partial outage",
              summary: "GitHub Actions is degraded.",
              capturedAt: "2026-08-05T02:00:00Z",
            },
            services: [
              {
                id: "service_github_actions",
                slug: "github-actions",
                name: "GitHub Actions",
                status: "degraded",
              },
              {
                id: "service_github_api",
                slug: "github-api",
                name: "GitHub API",
                status: "operational",
              },
            ],
            activeIncidents: [
              {
                id: "incident_github_actions",
                slug: "github-actions-delays",
                title: "Actions workflow delays",
                summary: "Some workflow jobs are delayed.",
                status: "monitoring",
                severity: "major",
                startedAt: "2026-08-05T01:00:00Z",
                updatedAt: "2026-08-05T01:30:00Z",
                affectedServices: [
                  { slug: "github-actions", name: "GitHub Actions" },
                ],
              },
            ],
            links: { html: "/providers/github" },
          },
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await outagedeckAdapter.fetchSnapshot({
      url: "https://outagedeck.com/providers/github",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://outagedeck.com/api/v1/providers/github",
      { headers: { Accept: "application/json" } },
    );
    expect(snapshot.error).toBeUndefined();
    expect(snapshot.pageName).toBe("GitHub");
    expect(snapshot.pageUrl).toBe("https://outagedeck.com/providers/github");
    expect(snapshot.indicator).toBe("major");
    expect(snapshot.components).toEqual([
      {
        id: "service_github_actions",
        name: "GitHub Actions",
        status: "degraded_performance",
      },
      {
        id: "service_github_api",
        name: "GitHub API",
        status: "operational",
      },
    ]);
    expect(snapshot.incidents[0]).toMatchObject({
      id: "incident_github_actions",
      impact: "major",
      affectedComponentIds: ["service_github_actions"],
    });
  });

  it("returns a visible error instead of reporting a failed request healthy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Unavailable", {
          status: 503,
          headers: { "content-type": "text/plain" },
        }),
      ),
    );

    const snapshot = await outagedeckAdapter.fetchSnapshot({
      url: "https://outagedeck.com/providers/slack",
    });

    expect(snapshot.error).toBe("HTTP 503");
    expect(snapshot.overallDescription).toBe("Failed to fetch");
    expect(snapshot.components).toEqual([]);
  });
});
