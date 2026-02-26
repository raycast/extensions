import { Icon } from "@raycast/api";
import MusicAssistantClient from "@/music-assistant/music-assistant-client";
import { Player } from "@/music-assistant/external-code/interfaces";
import {
  getPlayerListIcon,
  getPlayerListSubtitle,
  getPlayerListTitle,
  splitPlayersByGroupRole,
} from "@/player-management/player-list-helpers";

jest.mock("@raycast/api");

function createPlayer(overrides?: Partial<Player>): Player {
  return {
    player_id: "player-1",
    display_name: "Living Room",
    group_childs: [],
    ...overrides,
  } as unknown as Player;
}

describe("player-list-helpers", () => {
  let mockClient: jest.Mocked<MusicAssistantClient>;

  beforeEach(() => {
    mockClient = {
      getPlayerAlbumArt: jest.fn(),
      getGroupStatus: jest.fn(),
      getCurrentlyPlayingSong: jest.fn(),
      isGroupLeader: jest.fn(),
    } as unknown as jest.Mocked<MusicAssistantClient>;
  });

  it("returns dot icon for member rows", () => {
    const icon = getPlayerListIcon(mockClient, createPlayer(), { isMember: true });
    expect(icon).toBe(Icon.Dot);
  });

  it("returns album art icon when available", () => {
    mockClient.getPlayerAlbumArt.mockReturnValue("https://example.com/art.jpg");

    const icon = getPlayerListIcon(mockClient, createPlayer());

    expect(icon).toEqual({ source: "https://example.com/art.jpg", mask: "rounded-rectangle" });
  });

  it("falls back to status icon when no album art is available", () => {
    mockClient.getPlayerAlbumArt.mockReturnValue(undefined);
    mockClient.getGroupStatus.mockReturnValue("Standalone");

    expect(getPlayerListIcon(mockClient, createPlayer())).toBe(Icon.Cd);

    mockClient.getGroupStatus.mockReturnValue("Leader");
    expect(getPlayerListIcon(mockClient, createPlayer())).toBe(Icon.TwoPeople);
  });

  it("formats member and non-member titles", () => {
    const player = createPlayer({ display_name: "Kitchen" });
    expect(getPlayerListTitle(player)).toBe("Kitchen");
    expect(getPlayerListTitle(player, { isMember: true })).toBe("    Kitchen");
  });

  it("returns member subtitle for member rows", () => {
    const subtitle = getPlayerListSubtitle(mockClient, createPlayer(), { isMember: true });
    expect(subtitle).toBe("Group member");
  });

  it("returns now playing subtitle when available", () => {
    mockClient.getCurrentlyPlayingSong.mockReturnValue("Song - Artist");

    const subtitle = getPlayerListSubtitle(mockClient, createPlayer());
    expect(subtitle).toBe("Song - Artist");
  });

  it("returns status subtitle when nothing is playing", () => {
    mockClient.getCurrentlyPlayingSong.mockReturnValue("");
    mockClient.getGroupStatus.mockReturnValue("Leader");

    const leaderSubtitle = getPlayerListSubtitle(mockClient, createPlayer({ group_childs: ["member-1"] }));
    expect(leaderSubtitle).toBe("Group leader · 1 member(s)");

    mockClient.getGroupStatus.mockReturnValue("Standalone");
    const standaloneSubtitle = getPlayerListSubtitle(mockClient, createPlayer());
    expect(standaloneSubtitle).toBe("Standalone");
  });

  it("splits players into leaders and standalone players", () => {
    const players = [createPlayer({ player_id: "leader" }), createPlayer({ player_id: "standalone" })];
    mockClient.isGroupLeader.mockImplementation((player) => player.player_id === "leader");
    mockClient.getGroupStatus.mockImplementation((player) =>
      player.player_id === "standalone" ? "Standalone" : "Leader",
    );

    const result = splitPlayersByGroupRole(mockClient, players);

    expect(result.groupLeaders.map((p) => p.player_id)).toEqual(["leader"]);
    expect(result.standalonePlayers.map((p) => p.player_id)).toEqual(["standalone"]);
  });
});
