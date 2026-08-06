import { describe, it, expect, vi, beforeEach } from "vitest";

const gqlMock = vi.hoisted(() => vi.fn());
vi.mock("./client", () => ({ gql: gqlMock }));

import { getOrganizations } from "./organizations";

beforeEach(() => {
  gqlMock.mockReset();
});

describe("getOrganizations", () => {
  it("returns the organizations from the account", async () => {
    const organizations = [
      { id: "org-1", name: "Org One" },
      { id: "org-2", name: "Org Two" },
    ];
    gqlMock.mockResolvedValue({ account: { organizations } });

    await expect(getOrganizations()).resolves.toEqual(organizations);
    expect(gqlMock).toHaveBeenCalledTimes(1);
    const [, variables] = gqlMock.mock.calls[0];
    expect(variables).toBeUndefined();
  });
});
