import { LocalStorage } from "@raycast/api"
import {
  saveHistoryEntry,
  getHistory,
  clearHistory,
  deleteHistoryEntry,
} from "../historyStorage"
import { HistoryEntry } from "../../types"

// Mock LocalStorage
jest.mock("@raycast/api", () => ({
  LocalStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}))

describe("historyStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(LocalStorage.getItem as jest.Mock).mockResolvedValue(null)
  })

  describe("saveHistoryEntry", () => {
    it("should save a new history entry", async () => {
      const entry = {
        name: "Test Request",
        method: "GET" as const,
        url: "https://api.example.com/test",
        request: {
          headers: [],
          body: undefined,
          payload: undefined,
        },
        response: {
          statusCode: 200,
          headers: {},
          body: '{"success": true}',
        },
      }

      await saveHistoryEntry(entry)

      expect(LocalStorage.setItem).toHaveBeenCalledTimes(1)
      const callArgs = (LocalStorage.setItem as jest.Mock).mock.calls[0]
      expect(callArgs[0]).toBe("request_history")
      const savedData = JSON.parse(callArgs[1])
      expect(savedData).toHaveLength(1)
      expect(savedData[0]).toMatchObject({
        name: entry.name,
        method: entry.method,
        url: entry.url,
      })
      expect(savedData[0]).toHaveProperty("id")
      expect(savedData[0]).toHaveProperty("timestamp")
    })

    it("should prepend new entries to existing history", async () => {
      const existingEntry: HistoryEntry = {
        id: "old-id",
        timestamp: Date.now() - 10000,
        name: "Old Request",
        method: "POST",
        url: "https://api.example.com/old",
        request: { headers: [] },
        response: { statusCode: 201 },
      }

      ;(LocalStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([existingEntry])
      )

      const newEntry = {
        name: "New Request",
        method: "GET" as const,
        url: "https://api.example.com/new",
        request: { headers: [] },
        response: { statusCode: 200 },
      }

      await saveHistoryEntry(newEntry)

      const callArgs = (LocalStorage.setItem as jest.Mock).mock.calls[0]
      const savedData = JSON.parse(callArgs[1])
      expect(savedData).toHaveLength(2)
      expect(savedData[0].name).toBe("New Request")
      expect(savedData[1].name).toBe("Old Request")
    })

    it("should limit history to 20 entries", async () => {
      const existingEntries: HistoryEntry[] = Array.from(
        { length: 20 },
        (_, i) => ({
          id: `id-${i}`,
          timestamp: Date.now() - i * 1000,
          name: `Request ${i}`,
          method: "GET",
          url: `https://api.example.com/${i}`,
          request: { headers: [] },
          response: { statusCode: 200 },
        })
      )

      ;(LocalStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(existingEntries)
      )

      const newEntry = {
        name: "New Request",
        method: "GET" as const,
        url: "https://api.example.com/new",
        request: { headers: [] },
        response: { statusCode: 200 },
      }

      await saveHistoryEntry(newEntry)

      const callArgs = (LocalStorage.setItem as jest.Mock).mock.calls[0]
      const savedData = JSON.parse(callArgs[1])
      expect(savedData).toHaveLength(20)
      expect(savedData[0].name).toBe("New Request")
      expect(savedData[savedData.length - 1].name).toBe("Request 18")
    })
  })

  describe("getHistory", () => {
    it("should return empty array when no history exists", async () => {
      ;(LocalStorage.getItem as jest.Mock).mockResolvedValue(null)

      const history = await getHistory()

      expect(history).toEqual([])
    })

    it("should return parsed history entries", async () => {
      const entries: HistoryEntry[] = [
        {
          id: "1",
          timestamp: Date.now(),
          name: "Request 1",
          method: "GET",
          url: "https://api.example.com/1",
          request: { headers: [] },
          response: { statusCode: 200 },
        },
        {
          id: "2",
          timestamp: Date.now(),
          name: "Request 2",
          method: "POST",
          url: "https://api.example.com/2",
          request: { headers: [] },
          response: { statusCode: 201 },
        },
      ]

      ;(LocalStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(entries)
      )

      const history = await getHistory()

      expect(history).toEqual(entries)
      expect(history).toHaveLength(2)
    })

    it("should return empty array on parse error", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {
          // Suppress console.error output in tests
        })
      ;(LocalStorage.getItem as jest.Mock).mockResolvedValue("invalid json")

      const history = await getHistory()

      expect(history).toEqual([])
      consoleErrorSpy.mockRestore()
    })
  })

  describe("clearHistory", () => {
    it("should remove history key from storage", async () => {
      await clearHistory()

      expect(LocalStorage.removeItem).toHaveBeenCalledWith("request_history")
    })
  })

  describe("deleteHistoryEntry", () => {
    it("should delete a specific entry from history", async () => {
      const entries: HistoryEntry[] = [
        {
          id: "1",
          timestamp: Date.now(),
          name: "Request 1",
          method: "GET",
          url: "https://api.example.com/1",
          request: { headers: [] },
          response: { statusCode: 200 },
        },
        {
          id: "2",
          timestamp: Date.now(),
          name: "Request 2",
          method: "POST",
          url: "https://api.example.com/2",
          request: { headers: [] },
          response: { statusCode: 201 },
        },
      ]

      ;(LocalStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(entries)
      )

      await deleteHistoryEntry("1")

      expect(LocalStorage.setItem).toHaveBeenCalledTimes(1)
      const callArgs = (LocalStorage.setItem as jest.Mock).mock.calls[0]
      const savedData = JSON.parse(callArgs[1])
      expect(savedData).toHaveLength(1)
      expect(savedData[0].id).toBe("2")
    })

    it("should handle deleting non-existent entry", async () => {
      const entries: HistoryEntry[] = [
        {
          id: "1",
          timestamp: Date.now(),
          name: "Request 1",
          method: "GET",
          url: "https://api.example.com/1",
          request: { headers: [] },
          response: { statusCode: 200 },
        },
      ]

      ;(LocalStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(entries)
      )

      await deleteHistoryEntry("non-existent")

      const callArgs = (LocalStorage.setItem as jest.Mock).mock.calls[0]
      const savedData = JSON.parse(callArgs[1])
      expect(savedData).toHaveLength(1)
      expect(savedData[0].id).toBe("1")
    })
  })
})
