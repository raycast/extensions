import { parseBrimOutput } from "./claude-api-client";
import { getLimitRows } from "./limit-rows";

const resources = {
  session: { unit: "percent", used: 42.5, resetsAt: "2030-01-01T00:00:00.000Z" },
  weekly: { unit: "percent", used: 18, resetsAt: "2030-01-05T00:00:00.000Z" },
  fable: { unit: "percent", used: 7, resetsAt: "2030-01-05T00:00:00.000Z" },
  extra: { unit: "usd", used: 3 },
};
const output = (account: object) => JSON.stringify({ providers: { "claude@1": account } });

describe("parseBrimOutput", () => {
  it("maps Brim's resources to limit rows", () => {
    const result = parseBrimOutput(output({ resources }));
    if (result.status !== "ok") throw new Error("expected ok");
    expect(getLimitRows(result.data).map((row) => [row.label, row.utilization])).toEqual([
      ["5-Hour", 42.5],
      ["7-Day", 18],
      ["Fable", 7],
    ]);
  });

  it("reports a stale reading rather than passing it off as current", () => {
    const result = parseBrimOutput(output({ resources, stale: true, fetchedAt: "2030-01-01T00:00:00.000Z" }));
    expect(result.status).toBe("error");
  });

  it("reports no account and bad output", () => {
    expect(parseBrimOutput(JSON.stringify({ providers: {} })).status).toBe("error");
    expect(parseBrimOutput("nope").status).toBe("error");
  });
});
