import { expect, test } from "bun:test";
import "./raycast-mock";
const { connectionPresentation, summarize, titleCase } = await import("../src/lib/format");

test("list summaries show readable labels instead of Markdown syntax", () => {
  expect(summarize("Lists the [available assignees](https://docs.github.com/articles/assignees).")).toBe(
    "Lists the available assignees.",
  );
  expect(summarize("Use **labels** and `issue_id` with [API](https://example.com/api_(v1)).")).toBe(
    "Use labels and issue_id with API.",
  );
  expect(summarize("GET /accounts/{account_id}")).toBe("GET /accounts/{account_id}");
  expect(summarize("A longer description", 10)).toBe("A longer…");
});

test("field and connection labels preserve known acronyms", () => {
  expect(titleCase("allow_nsfw")).toBe("Allow NSFW");
  expect(titleCase("sdk")).toBe("SDK");
});

test("connection presentation uses the exact saved identity without repeating its scope", () => {
  const connections = [
    {
      integration: "custom_service",
      owner: "user" as const,
      name: "personal",
      identityLabel: "QA Lab",
    },
    {
      integration: "github",
      owner: "org" as const,
      name: "personal",
      identityLabel: "Acme GitHub",
    },
    {
      integration: "github",
      owner: "user" as const,
      name: "personal",
      identityLabel: "Personal",
    },
  ];

  expect(
    connectionPresentation({ integration: "custom_service", owner: "user", name: "personal" }, connections),
  ).toEqual({ text: "QA Lab · Personal", tooltip: "Personal connection: QA Lab" });
  expect(connectionPresentation({ integration: "github", owner: "user", name: "personal" }, connections)).toEqual({
    text: "Personal",
    tooltip: "Personal connection",
  });
});
