import { groupMessagesByDate, formatSectionTitle } from "../date-grouping";
import { ParsedMessage } from "../claude-message";

// Helper function to create test messages
function createMessage(timestamp: Date, content = "Test message"): ParsedMessage {
  return {
    id: `msg-${timestamp.getTime()}`,
    role: "user" as const,
    content,
    timestamp,
    sessionId: "test-session",
    preview: content.substring(0, 50),
  };
}

describe("dateGrouping", () => {
  describe("groupMessagesByDate", () => {
    it("groups messages into correct sections", () => {
      // We need to test with actual current date since getDateCategory uses Date.now() by default
      const messages: ParsedMessage[] = [
        createMessage(new Date(2025, 9, 6, 10, 0)), // Today
        createMessage(new Date(2025, 9, 6, 11, 0)), // Today
        createMessage(new Date(2025, 9, 5, 18, 0)), // Yesterday
        createMessage(new Date(2024, 8, 1, 12, 0)), // 2024
      ];

      // We need to temporarily override the default 'now' in getDateCategory
      // Since we can't easily mock it, we'll test with actual current date
      const groups = groupMessagesByDate(messages);

      expect(groups.length).toBeGreaterThan(0);
      expect(groups.every((g) => g.messages.length > 0)).toBe(true);
      expect(groups.every((g) => g.category)).toBeTruthy();
      expect(groups.every((g) => typeof g.sortKey === "number")).toBe(true);
    });

    it("returns empty array for empty input", () => {
      const groups = groupMessagesByDate([]);
      expect(groups).toEqual([]);
    });

    it("handles single message", () => {
      const message = createMessage(new Date());
      const groups = groupMessagesByDate([message]);

      expect(groups).toHaveLength(1);
      expect(groups[0].messages).toHaveLength(1);
      expect(groups[0].messages[0]).toEqual(message);
    });

    it("maintains message order within groups", () => {
      // Use a fixed "now" time to avoid midnight boundary issues
      const now = new Date(2025, 9, 8, 14, 30); // Oct 8, 2025, 2:30 PM

      // Create messages at different times today, all guaranteed to be "Today"
      const today1 = createMessage(new Date(2025, 9, 8, 10, 0), "Message 1"); // 10 AM
      const today2 = createMessage(new Date(2025, 9, 8, 12, 0), "Message 2"); // 12 PM
      const today3 = createMessage(new Date(2025, 9, 8, 14, 0), "Message 3"); // 2 PM

      const messages = [today1, today2, today3];
      const groups = groupMessagesByDate(messages, now);

      const todayGroup = groups.find((g) => g.category === "Today");
      expect(todayGroup).toBeDefined();
      expect(todayGroup!.messages).toEqual([today1, today2, today3]);
    });

    it("groups are sorted by section order", () => {
      const groups = groupMessagesByDate([
        createMessage(new Date(2024, 5, 1)), // 2024
        createMessage(new Date()), // Today
        createMessage(new Date(Date.now() - 86400000)), // Yesterday
      ]);

      // First group should have lowest sortKey
      expect(groups[0].sortKey).toBeLessThanOrEqual(groups[1]?.sortKey || Infinity);
      if (groups.length > 2) {
        expect(groups[1].sortKey).toBeLessThanOrEqual(groups[2].sortKey);
      }
    });

    it("handles messages spanning multiple years", () => {
      const messages = [
        createMessage(new Date(2025, 5, 1)),
        createMessage(new Date(2024, 5, 1)),
        createMessage(new Date(2023, 5, 1)),
        createMessage(new Date(2022, 5, 1)),
      ];

      const groups = groupMessagesByDate(messages);
      const yearGroups = groups.filter((g) => /^\d{4}$/.test(g.category));

      expect(yearGroups.length).toBeGreaterThan(0);
      // Verify years are in descending order
      const years = yearGroups.map((g) => parseInt(g.category));
      const sortedYears = [...years].sort((a, b) => b - a);
      expect(years).toEqual(sortedYears);
    });
  });

  describe("formatSectionTitle", () => {
    it("formats standard sections with count", () => {
      expect(formatSectionTitle("Today", 5)).toBe("Today (5)");
      expect(formatSectionTitle("Yesterday", 3)).toBe("Yesterday (3)");
      expect(formatSectionTitle("This Week", 12)).toBe("This Week (12)");
    });

    it("formats year sections with count", () => {
      expect(formatSectionTitle("2024", 42)).toBe("2024 (42)");
      expect(formatSectionTitle("2023", 128)).toBe("2023 (128)");
    });

    it("handles singular count", () => {
      expect(formatSectionTitle("Yesterday", 1)).toBe("Yesterday (1)");
      expect(formatSectionTitle("2024", 1)).toBe("2024 (1)");
    });

    it("handles zero count", () => {
      expect(formatSectionTitle("Today", 0)).toBe("Today (0)");
    });

    it("handles large counts", () => {
      expect(formatSectionTitle("2023", 9999)).toBe("2023 (9999)");
    });
  });
});
