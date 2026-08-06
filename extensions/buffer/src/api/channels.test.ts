import { describe, it, expect, vi, beforeEach } from "vitest";

const gqlMock = vi.hoisted(() => vi.fn());
vi.mock("./client", () => ({ gql: gqlMock }));

import { getChannels, getPinterestBoards } from "./channels";

beforeEach(() => {
  gqlMock.mockReset();
});

describe("getChannels", () => {
  it("sends the organizationId and an isLocked: false filter", async () => {
    gqlMock.mockResolvedValue({ channels: [] });

    await getChannels("org-1");

    expect(gqlMock).toHaveBeenCalledTimes(1);
    const [, variables] = gqlMock.mock.calls[0];
    expect(variables).toEqual({
      input: { organizationId: "org-1", filter: { isLocked: false } },
    });
  });

  it("returns the channels from the response", async () => {
    const channels = [
      {
        id: "chan1",
        name: "My Page",
        service: "facebook",
        type: "page",
        isLocked: false,
        isDisconnected: false,
      },
    ];
    gqlMock.mockResolvedValue({ channels });

    await expect(getChannels("org-1")).resolves.toEqual(channels);
  });
});

describe("getPinterestBoards", () => {
  it("sends the channelId as the input id", async () => {
    gqlMock.mockResolvedValue({ channel: { metadata: { boards: [] } } });

    await getPinterestBoards("chan1");

    expect(gqlMock).toHaveBeenCalledTimes(1);
    const [, variables] = gqlMock.mock.calls[0];
    expect(variables).toEqual({ input: { id: "chan1" } });
  });

  it("returns the boards from the channel metadata", async () => {
    const boards = [{ serviceId: "board-1", name: "Recipes" }];
    gqlMock.mockResolvedValue({ channel: { metadata: { boards } } });

    await expect(getPinterestBoards("chan1")).resolves.toEqual(boards);
  });

  it("returns an empty array when boards are missing", async () => {
    gqlMock.mockResolvedValue({ channel: { metadata: {} } });
    await expect(getPinterestBoards("chan1")).resolves.toEqual([]);
  });

  it("returns an empty array when the channel is missing", async () => {
    gqlMock.mockResolvedValue({});
    await expect(getPinterestBoards("chan1")).resolves.toEqual([]);
  });
});
