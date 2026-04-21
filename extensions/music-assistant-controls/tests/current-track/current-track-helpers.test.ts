import {
  formatAlbumTypeLabel,
  getCurrentTrackMarkdown,
  getFavoriteActionTitle,
  getFavoriteToastTitle,
  getShuffleToastMessage,
  getTrackPositionLabel,
} from "../../src/current-track/current-track-helpers";
import { MediaType, Track } from "../../src/music-assistant/external-code/interfaces";

function createMockTrack(overrides: Partial<Track> = {}): Track {
  return {
    item_id: "track-1",
    provider: "library",
    name: "Test Track",
    uri: "spotify:track:1",
    is_playable: true,
    media_type: MediaType.TRACK,
    provider_mappings: [],
    metadata: {},
    favorite: false,
    timestamp_added: 0,
    timestamp_modified: 0,
    duration: 180,
    artists: [],
    album: {
      item_id: "album-1",
      provider: "library",
      name: "Test Album",
      uri: "spotify:album:1",
      is_playable: false,
      media_type: MediaType.ALBUM,
      available: true,
    },
    ...overrides,
  };
}

describe("current-track helpers", () => {
  describe("getShuffleToastMessage", () => {
    it("should return disabled message when shuffle was enabled", () => {
      expect(getShuffleToastMessage(true)).toBe("Shuffle disabled");
    });

    it("should return enabled message when shuffle was disabled", () => {
      expect(getShuffleToastMessage(false)).toBe("Shuffle enabled");
    });
  });

  describe("favorites labels", () => {
    it("should return add favorite action when not favorite", () => {
      expect(getFavoriteActionTitle(false)).toBe("Add to Favorites");
    });

    it("should return remove favorite action when favorite", () => {
      expect(getFavoriteActionTitle(true)).toBe("Remove from Favorites");
    });

    it("should return added toast when not favorite", () => {
      expect(getFavoriteToastTitle(false)).toBe("Added to Favorites");
    });

    it("should return removed toast when favorite", () => {
      expect(getFavoriteToastTitle(true)).toBe("Removed from Favorites");
    });
  });

  describe("getCurrentTrackMarkdown", () => {
    it("should return no-track message when track name is missing", () => {
      const markdown = getCurrentTrackMarkdown(undefined, undefined);
      expect(markdown).toContain("No Track Playing");
    });

    it("should include title and artwork when provided", () => {
      const markdown = getCurrentTrackMarkdown("Track Name", "https://example.com/art.jpg");
      expect(markdown).toContain("# Track Name");
      expect(markdown).toContain("![Album Art](https://example.com/art.jpg?raycast-width=220&raycast-height=220)");
    });
  });

  describe("metadata helpers", () => {
    it("should format album type label", () => {
      expect(formatAlbumTypeLabel("single")).toBe("Single");
    });

    it("should return track position with disc and track numbers", () => {
      const track = createMockTrack({ disc_number: 2, track_number: 7 });
      expect(getTrackPositionLabel(track)).toBe("Disc 2, Track 7");
    });

    it("should return null when no disc or track numbers are available", () => {
      const track = createMockTrack({ disc_number: undefined, track_number: undefined });
      expect(getTrackPositionLabel(track)).toBeNull();
    });
  });
});
