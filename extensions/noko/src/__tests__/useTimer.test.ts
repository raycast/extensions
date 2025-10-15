import { renderHook } from "@testing-library/react";
import { useTimer } from "../hooks/useApiData";
import { TimerType, TimerStateEnum } from "../types";

// Mock the api client
jest.mock("../lib/api-client", () => ({
  apiClient: {
    headers: {
      "X-NokoToken": "test-token",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  },
}));

// Mock @raycast/utils
jest.mock("@raycast/utils", () => ({
  useFetch: jest.fn(),
}));

import { useFetch } from "@raycast/utils";

const mockUseFetch = useFetch as jest.MockedFunction<typeof useFetch>;

describe("useTimer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch timer data when projectId is provided", async () => {
    const mockTimerData: TimerType = {
      id: "timer-1",
      state: TimerStateEnum.Running,
      date: "2024-01-01",
      seconds: 3600,
      formatted_time: "1:00:00",
      description: "Test timer",
      user: {
        id: "user-1",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        profile_image_url: "https://example.com/avatar.jpg",
      },
      project: {
        id: "project-1",
        name: "Test Project",
        color: "#ff0000",
        enabled: true,
        billing_increment: 15,
      },
      url: "https://api.nokotime.com/v2/timers/timer-1",
      start_url: "https://api.nokotime.com/v2/timers/timer-1/start",
      pause_url: "https://api.nokotime.com/v2/timers/timer-1/pause",
      add_or_subtract_time_url:
        "https://api.nokotime.com/v2/timers/timer-1/add_or_subtract_time",
      log_url: "https://api.nokotime.com/v2/timers/timer-1/log",
      log_inbox_entry_url:
        "https://api.nokotime.com/v2/timers/timer-1/log_inbox_entry",
    };

    mockUseFetch.mockReturnValue({
      data: mockTimerData,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
      revalidate: jest.fn(),
      pagination: undefined,
    });

    const { result } = renderHook(() => useTimer("project-1"));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(mockTimerData);

    expect(mockUseFetch).toHaveBeenCalledWith(
      "https://api.nokotime.com/v2/projects/project-1/timer",
      {
        headers: {
          "X-NokoToken": "test-token",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        keepPreviousData: true,
        execute: true,
      },
    );
  });

  it("should not fetch when projectId is null", () => {
    mockUseFetch.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
      revalidate: jest.fn(),
      pagination: undefined,
    });

    const { result } = renderHook(() => useTimer(null));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();

    expect(mockUseFetch).toHaveBeenCalledWith(
      "https://api.nokotime.com/v2/projects/null/timer",
      {
        headers: {
          "X-NokoToken": "test-token",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        keepPreviousData: true,
        execute: false,
      },
    );
  });

  it("should handle API errors gracefully", async () => {
    mockUseFetch.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Timer not found"),
      mutate: jest.fn(),
      revalidate: jest.fn(),
      pagination: undefined,
    });

    const { result } = renderHook(() => useTimer("project-1"));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();

    expect(result.current.error).toBeDefined();
  });

  it("should handle network errors", async () => {
    mockUseFetch.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      mutate: jest.fn(),
      revalidate: jest.fn(),
      pagination: undefined,
    });

    const { result } = renderHook(() => useTimer("project-1"));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();

    expect(result.current.error).toBeDefined();
  });
});
