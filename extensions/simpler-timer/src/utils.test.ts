import { parseTimerInput, getTimers, addTimer, removeTimer, refreshTimers, TimerTask } from "./utils";
import fs from "fs";
import path from "path";

// Mock @raycast/api
jest.mock(
  "@raycast/api",
  () => ({
    environment: {
      supportPath: "/tmp/mock-support-path",
    },
  }),
  { virtual: true },
);

// Mock fs
jest.mock("fs");
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock process.kill
const originalProcessKill = process.kill;
const mockProcessKill = jest.fn();

describe("utils", () => {
  const TIMERS_FILE = path.join("/tmp/mock-support-path", "simple_timers.json");

  beforeAll(() => {
    process.kill = mockProcessKill;
  });

  afterAll(() => {
    process.kill = originalProcessKill;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessKill.mockImplementation(() => true);
  });

  describe("parseTimerInput", () => {
    it("parses valid input with minutes and content", () => {
      const result = parseTimerInput("10m Meeting");
      expect(result).toEqual({
        durationInSeconds: 600,
        originalTimePart: "10m",
        content: "Meeting",
      });
    });

    it("parses valid input with hours, minutes, seconds (no spaces between units)", () => {
      const result = parseTimerInput("1h10m30s Deep Work");
      expect(result).toEqual({
        durationInSeconds: 3600 + 600 + 30,
        originalTimePart: "1h10m30s",
        content: "Deep Work",
      });
    });

    it("parses valid input without content", () => {
      const result = parseTimerInput("5m");
      expect(result).toEqual({
        durationInSeconds: 300,
        originalTimePart: "5m",
        content: "Timer Done",
      });
    });

    it("parses input regardless of case", () => {
      const result = parseTimerInput("1H30M Test");
      expect(result).toEqual({
        durationInSeconds: 3600 + 1800,
        originalTimePart: "1H30M",
        content: "Test",
      });
    });

    it("returns null for invalid input", () => {
      expect(parseTimerInput("invalid")).toBeNull();
      expect(parseTimerInput("meeting 10m")).toBeNull(); // Time must be at start
    });
  });

  describe("getTimers", () => {
    it("returns empty array if file does not exist", () => {
      mockedFs.existsSync.mockReturnValue(false);
      const timers = getTimers();
      expect(timers).toEqual([]);
      expect(mockedFs.existsSync).toHaveBeenCalledWith(TIMERS_FILE);
    });

    it("returns parsed timers if file exists", () => {
      const mockTimers: TimerTask[] = [
        { id: "1", pid: 123, createdAt: 1000, duration: 60, originalInput: "1m", content: "Test", dueTime: 2000 },
      ];
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockTimers));

      const timers = getTimers();
      expect(timers).toEqual(mockTimers);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(TIMERS_FILE, "utf-8");
    });

    it("returns empty array if JSON parse fails", () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue("invalid json");

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const timers = getTimers();
      expect(timers).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  describe("addTimer", () => {
    it("adds a timer and saves it", () => {
      mockedFs.existsSync.mockReturnValue(false); // No existing file
      // ensureDirectoryExistence logic:
      // mockedFs.existsSync for dirname. Let's assume dirname exists for simplicity or mock it.
      // The code calls ensureDirectoryExistence recursively.
      // If we mock existsSync to return true for the dirname, it stops recursion.
      // dirname is /tmp/mock-support-path

      mockedFs.existsSync.mockImplementation((pathArg) => {
        if (pathArg === TIMERS_FILE) return false;
        return true; // Assume directories exist
      });

      const newTimer: TimerTask = {
        id: "1",
        pid: 123,
        createdAt: 1000,
        duration: 60,
        originalInput: "1m",
        content: "Test",
        dueTime: 2000,
      };

      addTimer(newTimer);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(TIMERS_FILE, JSON.stringify([newTimer], null, 2));
    });
  });

  describe("removeTimer", () => {
    it("removes a timer and kills the process", () => {
      const timerToRemove: TimerTask = {
        id: "1",
        pid: 123,
        createdAt: 1000,
        duration: 60,
        originalInput: "1m",
        content: "Test",
        dueTime: 2000,
      };
      const otherTimer: TimerTask = {
        id: "2",
        pid: 456,
        createdAt: 1000,
        duration: 60,
        originalInput: "1m",
        content: "Test 2",
        dueTime: 2000,
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify([timerToRemove, otherTimer]));

      removeTimer("1");

      // Check if process.kill was called with negative PID
      expect(mockProcessKill).toHaveBeenCalledWith(-123, "SIGTERM");

      // Check if file was saved with only the other timer
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(TIMERS_FILE, JSON.stringify([otherTimer], null, 2));
    });

    it("does not crash if process kill fails", () => {
      const timerToRemove: TimerTask = {
        id: "1",
        pid: 123,
        createdAt: 1000,
        duration: 60,
        originalInput: "1m",
        content: "Test",
        dueTime: 2000,
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify([timerToRemove]));

      mockProcessKill.mockImplementation(() => {
        throw new Error("Process not found");
      });

      // Should not throw
      removeTimer("1");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(TIMERS_FILE, JSON.stringify([], null, 2));
    });
  });

  describe("refreshTimers", () => {
    it("removes timers where process is not running", () => {
      const runningTimer: TimerTask = {
        id: "1",
        pid: 123,
        createdAt: Date.now(),
        duration: 60,
        originalInput: "1m",
        content: "Running",
        dueTime: Date.now() + 60000,
      };
      const deadTimer: TimerTask = {
        id: "2",
        pid: 456,
        createdAt: Date.now(),
        duration: 60,
        originalInput: "1m",
        content: "Dead",
        dueTime: Date.now() + 60000,
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify([runningTimer, deadTimer]));

      mockProcessKill.mockImplementation((pid) => {
        if (pid === 123) return true;
        throw new Error("Process not found");
      });

      const activeTimers = refreshTimers();

      expect(activeTimers).toEqual([runningTimer]);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(TIMERS_FILE, JSON.stringify([runningTimer], null, 2));
    });

    it("removes timers that are way past due time", () => {
      const oldTimer: TimerTask = {
        id: "1",
        pid: 123,
        createdAt: 1000,
        duration: 60,
        originalInput: "1m",
        content: "Old",
        dueTime: Date.now() - 10000, // 10 seconds ago
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify([oldTimer]));

      // Process exists but time is up
      mockProcessKill.mockReturnValue(true);

      const activeTimers = refreshTimers();

      expect(activeTimers).toEqual([]);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(TIMERS_FILE, JSON.stringify([], null, 2));
    });
  });
});
