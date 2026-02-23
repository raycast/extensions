import { MusicAssistantApi } from "../src/external-code/music-assistant-api";

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("MusicAssistantApi REST API", () => {
  let api: MusicAssistantApi;

  beforeEach(() => {
    api = new MusicAssistantApi();
    mockFetch.mockClear();
  });

  describe("sendCommand", () => {
    it("should successfully execute a command and return result", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: ["player1", "player2"] }),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");
      const result = await api.sendCommand("players/all");

      expect(result).toEqual(["player1", "player2"]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8095/api",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          },
        }),
      );
    });

    it("should handle null response from json() without crashing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      } as Response);

      api.initialize("http://localhost:8095", "test-token");
      const result = await api.sendCommand("test/command");

      expect(result).toBeNull();
    });

    it("should handle undefined data properties safely", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");
      const result = await api.sendCommand("test/command");

      expect(result).toEqual({});
    });

    it("should detect error_code in response and throw", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error_code: "INVALID_PLAYER" }),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");

      await expect(api.sendCommand("test/command")).rejects.toThrow("INVALID_PLAYER");
    });

    it("should detect error field in response and throw", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: "Something went wrong" }),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");

      await expect(api.sendCommand("test/command")).rejects.toThrow("Something went wrong");
    });

    it("should throw on non-ok response status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => "Invalid token",
      } as Response);

      api.initialize("http://localhost:8095", "test-token");

      await expect(api.sendCommand("test/command")).rejects.toThrow("API error: 401 Unauthorized");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      api.initialize("http://localhost:8095", "test-token");

      await expect(api.sendCommand("test/command")).rejects.toThrow("Network timeout");
    });
  });

  describe("playerCommandVolumeSet", () => {
    it("should send volume_set command with clamped volume", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");
      await api.playerCommandVolumeSet("player-1", 50);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody).toEqual({
        command: "players/cmd/volume_set",
        args: {
          player_id: "player-1",
          volume_level: 50,
        },
      });
    });

    it("should clamp volume to 100 when exceeding max", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");
      await api.playerCommandVolumeSet("player-1", 150);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.args.volume_level).toBe(100);
    });

    it("should clamp volume to 0 when below minimum", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");
      await api.playerCommandVolumeSet("player-1", -50);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.args.volume_level).toBe(0);
    });
  });

  describe("playerCommandVolumeMute", () => {
    it("should send volume_mute command with muted flag", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");
      await api.playerCommandVolumeMute("player-1", true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody).toEqual({
        command: "players/cmd/volume_mute",
        args: {
          player_id: "player-1",
          muted: true,
        },
      });
    });

    it("should send unmute command", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");
      await api.playerCommandVolumeMute("player-1", false);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.args.muted).toBe(false);
    });
  });

  describe("playerCommandSetMembers", () => {
    it("should send set_members command with all three parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");
      await api.playerCommandSetMembers("leader-1", ["member-1", "member-2"], ["member-3"]);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody).toEqual({
        command: "players/cmd/set_members",
        args: {
          target_player: "leader-1",
          player_ids_to_add: ["member-1", "member-2"],
          player_ids_to_remove: ["member-3"],
        },
      });
    });

    it("should send set_members with only add IDs", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");
      await api.playerCommandSetMembers("leader-1", ["member-1"]);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody).toEqual({
        command: "players/cmd/set_members",
        args: {
          target_player: "leader-1",
          player_ids_to_add: ["member-1"],
          player_ids_to_remove: undefined,
        },
      });
    });

    it("should send set_members with only remove IDs", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");
      await api.playerCommandSetMembers("leader-1", undefined, ["member-1"]);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody).toEqual({
        command: "players/cmd/set_members",
        args: {
          target_player: "leader-1",
          player_ids_to_add: undefined,
          player_ids_to_remove: ["member-1"],
        },
      });
    });
  });

  describe("playerCommandGroup", () => {
    it("should send group command with correct parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");
      await api.playerCommandGroup("member-1", "leader-1");

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody).toEqual({
        command: "players/cmd/group",
        args: {
          player_id: "member-1",
          target_player: "leader-1",
        },
      });
    });
  });

  describe("playerCommandUnGroup", () => {
    it("should send ungroup command with player_id", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");
      await api.playerCommandUnGroup("player-1");

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody).toEqual({
        command: "players/cmd/ungroup",
        args: {
          player_id: "player-1",
        },
      });
    });
  });

  describe("error handling with details field", () => {
    it("should use details field when present in error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error_code: "PLAYER_NOT_FOUND",
          details: "Player with ID xyz not found",
        }),
      } as Response);

      api.initialize("http://localhost:8095", "test-token");

      await expect(api.sendCommand("test/command")).rejects.toThrow("Player with ID xyz not found");
    });
  });
});
