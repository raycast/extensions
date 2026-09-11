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
  expect(titleCase("mta")).toBe("MTA");
});

test("connection presentation uses the exact saved identity without repeating its scope", () => {
  const connections = [
    {
      integration: "safetyculture",
      owner: "user" as const,
      name: "personal",
      identityLabel: "MTA",
    },
    {
      integration: "github",
      owner: "org" as const,
      name: "personal",
      identityLabel: "Bravas GitHub",
    },
    {
      integration: "github",
      owner: "user" as const,
      name: "personal",
      identityLabel: "Personal",
    },
  ];

  expect(
    connectionPresentation({ integration: "safetyculture", owner: "user", name: "personal" }, connections),
  ).toEqual({ text: "MTA · Personal", tooltip: "Personal connection: MTA" });
  expect(connectionPresentation({ integration: "github", owner: "user", name: "personal" }, connections)).toEqual({
    text: "Personal",
    tooltip: "Personal connection",
  });
});
