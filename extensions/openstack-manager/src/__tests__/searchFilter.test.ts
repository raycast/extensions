// Feature: openstack-manager, Property 11: Search filter returns only name-matching resources
// **Validates: Requirements 9.2**

import fc from "fast-check";
import { filterByName } from "../utils/searchFilter";

describe("Property 11: Search filter returns only name-matching resources", () => {
  it("for any list of items and any search string, the filtered result contains only and all items whose name contains the query (case-insensitive)", () => {
    const itemArb = fc.record({ name: fc.string(), id: fc.uuid() });

    fc.assert(
      fc.property(fc.array(itemArb), fc.string(), (items, query) => {
        const result = filterByName(items, query);

        if (query.length === 0) {
          // Empty query returns all items
          expect(result).toEqual(items);
        } else {
          const lowerQuery = query.toLowerCase();

          // Every returned item must contain the query in its name
          for (const item of result) {
            expect(item.name.toLowerCase()).toContain(lowerQuery);
          }

          // Every item from the original list that matches must be in the result
          const expected = items.filter((item) => item.name.toLowerCase().includes(lowerQuery));
          expect(result).toEqual(expected);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("returns all items when query is empty", () => {
    const items = [
      { name: "server-1", id: "a" },
      { name: "server-2", id: "b" },
    ];
    expect(filterByName(items, "")).toEqual(items);
  });

  it("filters case-insensitively", () => {
    const items = [
      { name: "MyServer", id: "1" },
      { name: "myserver", id: "2" },
      { name: "OTHER", id: "3" },
    ];
    const result = filterByName(items, "myserver");
    expect(result).toEqual([
      { name: "MyServer", id: "1" },
      { name: "myserver", id: "2" },
    ]);
  });

  it("returns empty array when no items match", () => {
    const items = [
      { name: "alpha", id: "1" },
      { name: "beta", id: "2" },
    ];
    expect(filterByName(items, "gamma")).toEqual([]);
  });
});
