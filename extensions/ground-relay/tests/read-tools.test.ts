import { describe, expect, it, vi } from "vitest";
import { packetFixture } from "./fixtures";
const inspect = vi.hoisted(() => vi.fn());
vi.mock("../src/services/ledger", () => ({ inspectGroundPackets: inspect }));
import list from "../src/tools/list-ground-packets";
import get from "../src/tools/get-ground-packet";
describe("read-only AI tools", () => {
  it("returns summaries then exact records from the service, carrying warnings", async () => {
    const record = packetFixture();
    inspect.mockResolvedValue({
      records: [record],
      warnings: ["bad.json: invalid"],
    });
    const listing = JSON.parse(await list({}));
    expect(listing.records[0]).toMatchObject({
      id: record.id,
      title: record.draft.title,
    });
    expect(listing.records[0].draft).toBeUndefined();
    const found = JSON.parse(await get({ id: record.id }));
    expect(found.record).toEqual(record);
    expect(found.warnings).toEqual(["bad.json: invalid"]);
  });
  it("propagates an unavailable ledger instead of fabricating an empty successful result", async () => {
    inspect.mockRejectedValue(new Error("Unavailable"));
    await expect(list({})).rejects.toThrow("Unavailable");
  });
});
