import { Player } from "../../src/music-assistant/external-code/interfaces";
import {
  getPlayerListTitle,
  getPlayerListSubtitle,
  getPlayerAlbumArtUrl,
  splitPlayersByGroupRole,
} from "../../src/music-assistant/delegates/player-list-display-delegate";

function createPlayer(overrides?: Partial<Player>): Player {
  return {
    player_id: "player-1",
    display_name: "Living Room",
    group_childs: [],
    volume_level: 0,
    synced_to: null,
    active_group: null,
    current_media: undefined,
    can_group_with: [],
    ...overrides,
  } as unknown as Player;
}

describe("player-list-display-delegate", () => {
  describe("getPlayerListTitle", () => {
    it("returns player display name for non-members", () => {
      const player = createPlayer({ display_name: "Kitchen" });
      expect(getPlayerListTitle(player)).toBe("Kitchen");
    });

    it("returns indented display name for members", () => {
      const player = createPlayer({ display_name: "Kitchen" });
      expect(getPlayerListTitle(player, { isMember: true })).toBe("    Kitchen");
    });
  });

  describe("getPlayerListSubtitle", () => {
    it("returns member subtitle with volume level", () => {
      const player = createPlayer({ volume_level: 75 });
      const subtitle = getPlayerListSubtitle(player, { isMember: true });
      expect(subtitle).toBe("Group member · Volume: 75%");
    });

    it("handles null volume level for member", () => {
      const player = createPlayer({ volume_level: null } as any);
      const subtitle = getPlayerListSubtitle(player, { isMember: true });
      expect(subtitle).toBe("Group member · Volume: 0%");
    });

    it("returns now playing song when available", () => {
      const player = createPlayer({
        current_media: {
          title: "Test Song",
          artist: "Test Artist",
        } as any,
      });
      const subtitle = getPlayerListSubtitle(player);
      expect(subtitle).toBe("Test Song - Test Artist");
    });

    it("returns leader subtitle for group leader", () => {
      const player = createPlayer({ group_childs: ["member-1", "member-2"] });
      const subtitle = getPlayerListSubtitle(player);
      expect(subtitle).toBe("Group leader · 2 member(s)");
    });

    it("returns standalone subtitle for standalone player", () => {
      const player = createPlayer();
      const subtitle = getPlayerListSubtitle(player);
      expect(subtitle).toBe("Standalone");
    });
  });

  describe("getPlayerAlbumArtUrl", () => {
    it("returns image URL when available", () => {
      const player = createPlayer({
        current_media: {
          image_url: "https://example.com/art.jpg",
        } as any,
      });
      expect(getPlayerAlbumArtUrl(player)).toBe("https://example.com/art.jpg");
    });

    it("returns undefined when no current media", () => {
      const player = createPlayer({ current_media: undefined });
      expect(getPlayerAlbumArtUrl(player)).toBeUndefined();
    });

    it("returns undefined when no image URL", () => {
      const player = createPlayer({
        current_media: { title: "Song" } as any,
      });
      expect(getPlayerAlbumArtUrl(player)).toBeUndefined();
    });

    it("handles undefined player", () => {
      expect(getPlayerAlbumArtUrl(undefined)).toBeUndefined();
    });
  });

  describe("splitPlayersByGroupRole", () => {
    it("separates group leaders from standalone players", () => {
      const players = [
        createPlayer({ player_id: "leader-1", group_childs: ["member-1"] }),
        createPlayer({ player_id: "member-1" }),
        createPlayer({ player_id: "standalone-1" }),
      ];

      const result = splitPlayersByGroupRole(players);

      expect(result.groupLeaders).toHaveLength(1);
      expect(result.groupLeaders[0].player_id).toBe("leader-1");
      expect(result.standalonePlayers).toHaveLength(2);
    });

    it("handles undefined players", () => {
      const result = splitPlayersByGroupRole(undefined);

      expect(result.groupLeaders).toHaveLength(0);
      expect(result.standalonePlayers).toHaveLength(0);
    });

    it("handles empty players array", () => {
      const result = splitPlayersByGroupRole([]);

      expect(result.groupLeaders).toHaveLength(0);
      expect(result.standalonePlayers).toHaveLength(0);
    });
  });
});
