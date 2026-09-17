import { describe, expect, it } from "vitest";
import {
  accountListSections,
  accountErrorMarkdown,
  accountMarkdown,
  formatQuotaUsd,
  mapAccountSummary,
} from "./account-view";
import { ApiError } from "./http";
import type { AccountSummary } from "./api";

const response: AccountSummary = {
  success: true,
  data: {
    username: "ray-user",
    display_name: "Ray User",
    wallet: { quota: 7200, currency: "USD" },
    oauth_token: { expires_at: 2_000_000_000 },
    usage: {
      today: {
        requests: 2,
        quota: 120,
        prompt_tokens: 10,
        completion_tokens: 5,
      },
      last_7_days: {
        requests: 8,
        quota: 420,
        prompt_tokens: 50,
        completion_tokens: 25,
      },
      top_models: [{ model: "gpt-5", requests: 5, quota: 300 }],
    },
  },
};

describe("account view", () => {
  it("formats quota in deployment units", () => {
    expect(formatQuotaUsd(7200, 500_000)).toBe("$0.0144");
    expect(formatQuotaUsd(0, 500_000)).toBe("$0.00");
    expect(formatQuotaUsd(5_252_010_000, 500_000)).toBe("$10,504.02");
  });

  it("maps wallet and usage without using OAuth-token quota", () => {
    const view = mapAccountSummary(response, 500_000);
    expect(view.balance).toBe("$0.0144");
    expect(view.todaySpend).toBe("$0.0002");
    expect(view.weekRequests).toBe(8);
    expect(view.topModels[0]).toMatchObject({ model: "gpt-5", requests: 5 });
  });

  it("renders primary wallet data even when usage is empty", () => {
    const empty = structuredClone(response);
    empty.data.usage.today = {
      requests: 0,
      quota: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
    };
    empty.data.usage.last_7_days = { ...empty.data.usage.today };
    empty.data.usage.top_models = [];

    const markdown = accountMarkdown(mapAccountSummary(empty, 500_000));
    expect(markdown).toContain("$0.0144");
    expect(markdown).toContain("No requests in the last 7 days");
  });

  it("formats large request counts for scanning", () => {
    const large = structuredClone(response);
    large.data.usage.today.requests = 4_752;
    large.data.usage.last_7_days.requests = 51_399;
    large.data.usage.top_models[0].requests = 26_348;

    const markdown = accountMarkdown(mapAccountSummary(large, 500_000));
    expect(markdown).toContain("4,752 requests");
    expect(markdown).toContain("51,399 requests");
    expect(markdown).toContain("26,348 requests");
  });

  it("builds concise native list sections", () => {
    const sections = accountListSections(mapAccountSummary(response, 500_000));
    expect(sections.map((section) => section.title)).toEqual([
      "Overview",
      "Top Models · Last 7 Days",
    ]);
    expect(sections[0].rows).toEqual([
      {
        id: "balance",
        title: "Available Balance",
        value: "$0.0144",
        subtitle: "Ray User",
      },
      {
        id: "today",
        title: "Today",
        value: "$0.0002",
        subtitle: "2 requests",
      },
      {
        id: "week",
        title: "Last 7 Days",
        value: "$0.0008",
        subtitle: "8 requests",
      },
    ]);
    expect(sections[1].rows[0]).toMatchObject({
      title: "gpt-5",
      value: "$0.0006",
      subtitle: "5 requests",
    });
  });

  it("explains gateways that predate account summary support", () => {
    expect(accountErrorMarkdown(new ApiError(404, "not found"))).toContain(
      "Gateway Update Required",
    );
    expect(accountErrorMarkdown(new ApiError(404, "not found"))).not.toContain(
      "not found",
    );
  });
});
