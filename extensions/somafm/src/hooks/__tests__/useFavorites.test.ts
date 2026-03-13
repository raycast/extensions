import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useFavorites } from "../useFavorites";
import * as storage from "../../utils/storage";

vi.mock("../../utils/storage", () => ({
  getFavorites: vi.fn(),
  toggleFavorite: vi.fn(),
}));

describe("useFavorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load favorites on mount", async () => {
    const mockFavorites = ["station1", "station2"];
    vi.mocked(storage.getFavorites).mockResolvedValue(mockFavorites);

    const { result } = renderHook(() => useFavorites());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for favorites to load
    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(storage.getFavorites).toHaveBeenCalled();
    expect(result.current.favorites).toEqual(mockFavorites);
  });

  it("should check if a station is favorite", async () => {
    const mockFavorites = ["station1", "station2"];
    vi.mocked(storage.getFavorites).mockResolvedValue(mockFavorites);

    const { result } = renderHook(() => useFavorites());

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isFavorite("station1")).toBe(true);
    expect(result.current.isFavorite("station3")).toBe(false);
  });

  it("should toggle favorite station", async () => {
    const mockFavorites = ["station1"];
    vi.mocked(storage.getFavorites).mockResolvedValue(mockFavorites);
    vi.mocked(storage.toggleFavorite).mockResolvedValue(true);

    const { result } = renderHook(() => useFavorites());

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleFavoriteStation("station2", "Station 2");
    });

    expect(storage.toggleFavorite).toHaveBeenCalledWith("station2");
  });
});
