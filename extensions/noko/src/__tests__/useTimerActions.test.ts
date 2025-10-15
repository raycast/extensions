import { renderHook, act } from "@testing-library/react";
import { showToast, Toast } from "@raycast/api";
import { ProjectType } from "../types";

// Mock dependencies before importing
jest.mock("@raycast/api");

// Mock the API client module
jest.mock("../lib/api-client", () => ({
  apiClient: {
    put: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Now import the modules that depend on the mocks
import { useTimerActions } from "../hooks/useTimerActions";
import { apiClient } from "../lib/api-client";

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;

describe("useTimerActions", () => {
  const mockProject: ProjectType = {
    id: "1",
    name: "Test Project",
    color: "#ff0000",
    enabled: true,
    billing_increment: 15,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("startTimer", () => {
    it("should start timer successfully", async () => {
      mockApiClient.put.mockResolvedValueOnce({
        success: true,
        data: {},
      });

      const { result } = renderHook(() => useTimerActions());

      await act(async () => {
        await result.current.startTimer(mockProject);
      });

      expect(mockApiClient.put).toHaveBeenCalledWith("/projects/1/timer/start");
      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Timer Started",
        message: "Started timer for Test Project",
      });
    });

    it("should handle start timer failure", async () => {
      mockApiClient.put.mockResolvedValueOnce({
        success: false,
        error: "Project not found",
      });

      const { result } = renderHook(() => useTimerActions());

      await act(async () => {
        await result.current.startTimer(mockProject);
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Failed to Start Timer",
        message: "Project not found",
      });
    });

    it("should call onSuccess callback when provided", async () => {
      const onSuccess = jest.fn();
      mockApiClient.put.mockResolvedValueOnce({
        success: true,
        data: {},
      });

      const { result } = renderHook(() => useTimerActions({ onSuccess }));

      await act(async () => {
        await result.current.startTimer(mockProject);
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it("should call onError callback when provided", async () => {
      const onError = jest.fn();
      mockApiClient.put.mockResolvedValueOnce({
        success: false,
        error: "API Error",
      });

      const { result } = renderHook(() => useTimerActions({ onError }));

      await act(async () => {
        await result.current.startTimer(mockProject);
      });

      expect(onError).toHaveBeenCalledWith("API Error");
    });
  });

  describe("pauseTimer", () => {
    it("should pause timer successfully", async () => {
      mockApiClient.put.mockResolvedValueOnce({
        success: true,
        data: {},
      });

      const { result } = renderHook(() => useTimerActions());

      await act(async () => {
        await result.current.pauseTimer(mockProject);
      });

      expect(mockApiClient.put).toHaveBeenCalledWith("/projects/1/timer/pause");
      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Timer Paused",
        message: "Paused timer for Test Project",
      });
    });

    it("should handle pause timer failure", async () => {
      mockApiClient.put.mockResolvedValueOnce({
        success: false,
        error: "Timer not running",
      });

      const { result } = renderHook(() => useTimerActions());

      await act(async () => {
        await result.current.pauseTimer(mockProject);
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Failed to Pause Timer",
        message: "Timer not running",
      });
    });
  });

  describe("discardTimer", () => {
    it("should discard timer successfully", async () => {
      mockApiClient.delete.mockResolvedValueOnce({
        success: true,
        data: {},
      });

      const { result } = renderHook(() => useTimerActions());

      await act(async () => {
        await result.current.discardTimer(mockProject);
      });

      expect(mockApiClient.delete).toHaveBeenCalledWith("/projects/1/timer");
      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Timer Discarded",
        message: "Timer discarded for Test Project (time not saved)",
      });
    });

    it("should handle discard timer failure", async () => {
      mockApiClient.delete.mockResolvedValueOnce({
        success: false,
        error: "No timer to discard",
      });

      const { result } = renderHook(() => useTimerActions());

      await act(async () => {
        await result.current.discardTimer(mockProject);
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Failed to Discard Timer",
        message: "No timer to discard",
      });
    });
  });

  describe("logTimer", () => {
    it("should log timer successfully", async () => {
      const entryData = {
        minutes: "60",
        project_name: "Test Project",
        description: "Worked on feature",
        tags: [],
        date: new Date(),
      };

      mockApiClient.put.mockResolvedValueOnce({
        success: true,
        data: {},
      });

      const { result } = renderHook(() => useTimerActions());

      await act(async () => {
        await result.current.logTimer("1", entryData);
      });

      expect(mockApiClient.put).toHaveBeenCalledWith("/projects/1/timer/log", {
        minutes: 60,
        description: "Worked on feature",
        entry_date: expect.any(String),
      });
      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Timer Logged",
        message: "Timer logged for project",
      });
    });

    it("should handle log timer failure", async () => {
      const entryData = {
        minutes: "60",
        project_name: "Test Project",
        description: "Worked on feature",
        tags: [],
        date: new Date(),
      };

      mockApiClient.put.mockResolvedValueOnce({
        success: false,
        error: "Invalid entry data",
      });

      const { result } = renderHook(() => useTimerActions());

      await act(async () => {
        await result.current.logTimer("1", entryData);
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Failed to Log Timer",
        message: "Invalid entry data",
      });
    });
  });

  describe("error handling", () => {
    it("should handle network errors", async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useTimerActions());

      await act(async () => {
        await result.current.startTimer(mockProject);
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Failed to Start Timer",
        message: "Network error",
      });
    });

    it("should handle unknown errors", async () => {
      mockApiClient.put.mockRejectedValueOnce("Unknown error");

      const { result } = renderHook(() => useTimerActions());

      await act(async () => {
        await result.current.startTimer(mockProject);
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Failed to Start Timer",
        message: "Unknown error",
      });
    });
  });
});
