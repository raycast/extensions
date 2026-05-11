import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  parseWorkspaces,
  getDefaultWorkspace,
  formatDuration,
  formatDateAbsolute,
  formatDateRelative,
  formatDate,
  formatTime,
  getDateGroup,
  groupMeetingsByDate,
  filterMeetingsByDate,
  searchMeetings,
  calculateSpeakerStats,
  getPageSize,
  getCacheTTL,
} from "./utils";
import { Meeting } from "./types";

describe("parseWorkspaces", () => {
  it("should parse single workspace", () => {
    const prefs: Partial<Preferences> = {
      workspace1ApiKey: "key1",
      workspace1Name: "Test Workspace",
    };
    const result = parseWorkspaces(prefs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: "Test Workspace", apiKey: "key1" });
  });

  it("should use default name when not provided", () => {
    const prefs: Partial<Preferences> = {
      workspace1ApiKey: "key1",
    };
    const result = parseWorkspaces(prefs);
    expect(result[0].name).toBe("Default");
  });

  it("should parse multiple workspaces", () => {
    const prefs: Partial<Preferences> = {
      workspace1ApiKey: "key1",
      workspace1Name: "Work",
      workspace2ApiKey: "key2",
      workspace2Name: "Personal",
      workspace3ApiKey: "key3",
    };
    const result = parseWorkspaces(prefs);
    expect(result).toHaveLength(3);
    expect(result[2].name).toBe("Workspace 3");
  });

  it("should skip workspaces without API key", () => {
    const prefs: Partial<Preferences> = {
      workspace1ApiKey: "key1",
      workspace2Name: "No Key",
    };
    const result = parseWorkspaces(prefs);
    expect(result).toHaveLength(1);
  });

  it("should trim whitespace", () => {
    const prefs: Partial<Preferences> = {
      workspace1ApiKey: "  key1  ",
      workspace1Name: "  Trimmed  ",
    };
    const result = parseWorkspaces(prefs);
    expect(result[0]).toEqual({ name: "Trimmed", apiKey: "key1" });
  });
});

describe("getDefaultWorkspace", () => {
  const workspaces = [
    { name: "Work", apiKey: "key1" },
    { name: "Personal", apiKey: "key2" },
  ];

  it("should return first workspace when no default specified", () => {
    const result = getDefaultWorkspace(workspaces);
    expect(result).toEqual(workspaces[0]);
  });

  it("should return matching workspace by name", () => {
    const result = getDefaultWorkspace(workspaces, "Personal");
    expect(result).toEqual(workspaces[1]);
  });

  it("should return first workspace when default not found", () => {
    const result = getDefaultWorkspace(workspaces, "NonExistent");
    expect(result).toEqual(workspaces[0]);
  });

  it("should return undefined for empty workspaces", () => {
    const result = getDefaultWorkspace([]);
    expect(result).toBeUndefined();
  });
});

describe("formatDuration", () => {
  it("should format minutes only", () => {
    expect(formatDuration(300)).toBe("5m");
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(0)).toBe("0m");
  });

  it("should format hours and minutes", () => {
    expect(formatDuration(3600)).toBe("1h 0m");
    expect(formatDuration(3660)).toBe("1h 1m");
    expect(formatDuration(7200)).toBe("2h 0m");
    expect(formatDuration(5400)).toBe("1h 30m");
  });
});

describe("formatTime", () => {
  it("should format as mm:ss", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(600)).toBe("10:00");
    expect(formatTime(3661)).toBe("61:01");
  });
});

describe("formatDateAbsolute", () => {
  it("should format date with locale", () => {
    const result = formatDateAbsolute("2024-01-15T10:30:00Z");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});

describe("formatDateRelative", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "Just now" for recent times', () => {
    expect(formatDateRelative("2024-01-15T11:59:30Z")).toBe("Just now");
  });

  it("should return minutes ago", () => {
    expect(formatDateRelative("2024-01-15T11:30:00Z")).toBe("30m ago");
  });

  it("should return hours ago", () => {
    expect(formatDateRelative("2024-01-15T10:00:00Z")).toBe("2h ago");
  });

  it('should return "Yesterday"', () => {
    expect(formatDateRelative("2024-01-14T12:00:00Z")).toBe("Yesterday");
  });

  it("should return days ago", () => {
    expect(formatDateRelative("2024-01-12T12:00:00Z")).toBe("3d ago");
  });

  it("should return weeks ago", () => {
    expect(formatDateRelative("2024-01-01T12:00:00Z")).toBe("2w ago");
  });
});

describe("formatDate", () => {
  it("should use relative format by default", () => {
    const result = formatDate("2024-01-15T10:00:00Z");
    expect(result).toBeTruthy();
  });

  it("should use absolute format when specified", () => {
    const result = formatDate("2024-01-15T10:00:00Z", "absolute");
    expect(result).toBeTruthy();
  });
});

describe("getDateGroup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-18T12:00:00Z")); // Thursday
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "Today" for today', () => {
    expect(getDateGroup("2024-01-18T10:00:00Z")).toBe("Today");
  });

  it('should return "Yesterday" for yesterday', () => {
    expect(getDateGroup("2024-01-17T10:00:00Z")).toBe("Yesterday");
  });

  it('should return "This Week" for this week', () => {
    // 2024-01-18 is Thursday, week starts on Sunday (2024-01-14)
    expect(getDateGroup("2024-01-15T10:00:00Z")).toBe("This Week"); // Monday of this week
  });

  it('should return "This Month" for this month', () => {
    expect(getDateGroup("2024-01-05T10:00:00Z")).toBe("This Month");
  });

  it("should return month name for older dates", () => {
    const result = getDateGroup("2023-12-15T10:00:00Z");
    expect(result).toContain("2023");
  });
});

describe("groupMeetingsByDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-18T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should group meetings by date", () => {
    const meetings: Meeting[] = [
      createMeeting("1", "Meeting 1", "2024-01-18T10:00:00Z"),
      createMeeting("2", "Meeting 2", "2024-01-18T09:00:00Z"),
      createMeeting("3", "Meeting 3", "2024-01-17T10:00:00Z"),
    ];

    const result = groupMeetingsByDate(meetings);
    expect(result.get("Today")).toHaveLength(2);
    expect(result.get("Yesterday")).toHaveLength(1);
  });

  it("should handle empty array", () => {
    const result = groupMeetingsByDate([]);
    expect(result.size).toBe(0);
  });
});

describe("filterMeetingsByDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-18T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const meetings: Meeting[] = [
    createMeeting("1", "Today", "2024-01-18T10:00:00Z"),
    createMeeting("2", "Yesterday", "2024-01-17T10:00:00Z"),
    createMeeting("3", "This Week", "2024-01-12T10:00:00Z"), // 6 days ago
    createMeeting("4", "Three Weeks Ago", "2023-12-28T10:00:00Z"),
  ];

  it('should return all meetings for "all" filter', () => {
    expect(filterMeetingsByDate(meetings, "all")).toHaveLength(4);
  });

  it("should filter today", () => {
    expect(filterMeetingsByDate(meetings, "today")).toHaveLength(1);
  });

  it("should filter this week (last 7 days)", () => {
    // week filter = last 7 days from today (2024-01-18)
    // Includes: 2024-01-18, 2024-01-17, 2024-01-12 (6 days ago)
    expect(filterMeetingsByDate(meetings, "week")).toHaveLength(3);
  });

  it("should filter this month (last 30 days)", () => {
    // month filter = last 30 days from today (2024-01-18)
    // All meetings are within 30 days
    expect(filterMeetingsByDate(meetings, "month")).toHaveLength(4);
  });
});

describe("searchMeetings", () => {
  const meetings: Meeting[] = [
    createMeeting("1", "Weekly Standup", "2024-01-15T10:00:00Z", "John Doe", [
      "Alice",
      "Bob",
    ]),
    createMeeting("2", "Design Review", "2024-01-14T10:00:00Z", "Jane Smith", [
      "Charlie",
    ]),
    createMeeting(
      "3",
      "Sprint Planning",
      "2024-01-13T10:00:00Z",
      "Bob Wilson",
      [],
    ),
  ];

  it("should return all meetings for empty query", () => {
    expect(searchMeetings(meetings, "")).toHaveLength(3);
    expect(searchMeetings(meetings, "   ")).toHaveLength(3);
  });

  it("should search by title", () => {
    expect(searchMeetings(meetings, "standup")).toHaveLength(1);
    expect(searchMeetings(meetings, "STANDUP")).toHaveLength(1); // case insensitive
  });

  it("should search by organizer", () => {
    expect(searchMeetings(meetings, "john")).toHaveLength(1);
    expect(searchMeetings(meetings, "smith")).toHaveLength(1);
  });

  it("should search by invitee", () => {
    expect(searchMeetings(meetings, "alice")).toHaveLength(1);
    expect(searchMeetings(meetings, "bob")).toHaveLength(2); // organizer + invitee
  });

  it("should return empty for no matches", () => {
    expect(searchMeetings(meetings, "nonexistent")).toHaveLength(0);
  });
});

describe("calculateSpeakerStats", () => {
  it("should calculate speaker durations", () => {
    const transcript = [
      { speaker: "Alice", startTime: 0, endTime: 10 },
      { speaker: "Bob", startTime: 10, endTime: 25 },
      { speaker: "Alice", startTime: 25, endTime: 40 },
    ];

    const result = calculateSpeakerStats(transcript);
    expect(result.get("Alice")).toBe(25);
    expect(result.get("Bob")).toBe(15);
  });

  it("should handle empty transcript", () => {
    const result = calculateSpeakerStats([]);
    expect(result.size).toBe(0);
  });
});

describe("getPageSize", () => {
  it("should return default value", () => {
    expect(getPageSize({})).toBe(50);
  });

  it("should parse valid page size", () => {
    expect(getPageSize({ pageSize: "25" })).toBe(25);
    expect(getPageSize({ pageSize: "100" })).toBe(100);
  });

  it("should clamp to valid range", () => {
    // Test edge cases with type assertions for invalid preference values
    expect(
      getPageSize({ pageSize: "5" } as unknown as Partial<Preferences>),
    ).toBe(10);
    expect(
      getPageSize({ pageSize: "200" } as unknown as Partial<Preferences>),
    ).toBe(100);
  });

  it("should handle invalid input", () => {
    expect(
      getPageSize({ pageSize: "invalid" } as unknown as Partial<Preferences>),
    ).toBe(50);
  });
});

describe("getCacheTTL", () => {
  it("should return default value", () => {
    expect(getCacheTTL({})).toBe(15);
  });

  it("should parse valid TTL", () => {
    expect(getCacheTTL({ cacheTTL: "30" })).toBe(30);
    expect(getCacheTTL({ cacheTTL: "60" })).toBe(60);
  });

  it("should ensure minimum TTL", () => {
    expect(
      getCacheTTL({ cacheTTL: "0" } as unknown as Partial<Preferences>),
    ).toBe(1);
  });

  it("should handle invalid input", () => {
    expect(
      getCacheTTL({ cacheTTL: "invalid" } as unknown as Partial<Preferences>),
    ).toBe(15);
  });
});

// Helper function to create mock meetings
function createMeeting(
  id: string,
  name: string,
  happenedAt: string,
  organizerName = "Organizer",
  inviteeNames: string[] = [],
): Meeting {
  return {
    id,
    name,
    happenedAt,
    url: `https://tldv.io/meetings/${id}`,
    duration: 1800,
    organizer: {
      name: organizerName,
      email: `${organizerName.toLowerCase().replace(" ", ".")}@example.com`,
    },
    invitees: inviteeNames.map((n) => ({
      name: n,
      email: `${n.toLowerCase()}@example.com`,
    })),
  };
}
