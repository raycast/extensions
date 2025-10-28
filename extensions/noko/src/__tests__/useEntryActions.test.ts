import { renderHook, act } from "@testing-library/react";
import { useEntryActions } from "../hooks/useEntryActions";
import { apiClient } from "../lib/api-client";
import { showSuccessToast, showErrorToast } from "../utils";

// Mock the API client
jest.mock("../lib/api-client", () => ({
  apiClient: {
    delete: jest.fn(),
  },
}));

// Mock the utils
jest.mock("../utils", () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("useEntryActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("deleteEntry", () => {
    it("should successfully delete an entry", async () => {
      const mockOnSuccess = jest.fn();
      const mockOnError = jest.fn();

      mockApiClient.delete.mockResolvedValueOnce({
        success: true,
        data: {},
      });

      const { result } = renderHook(() =>
        useEntryActions({
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      );

      await act(async () => {
        await result.current.deleteEntry("123");
      });

      expect(mockApiClient.delete).toHaveBeenCalledWith("/entries/123");
      expect(showSuccessToast).toHaveBeenCalledWith(
        "Entry Deleted",
        "Time entry has been deleted successfully",
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it("should handle API error when deleting entry", async () => {
      const mockOnSuccess = jest.fn();
      const mockOnError = jest.fn();

      mockApiClient.delete.mockResolvedValueOnce({
        success: false,
        error: "Entry not found",
      });

      const { result } = renderHook(() =>
        useEntryActions({
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      );

      await act(async () => {
        await result.current.deleteEntry("123");
      });

      expect(mockApiClient.delete).toHaveBeenCalledWith("/entries/123");
      expect(showErrorToast).toHaveBeenCalledWith(
        "Failed to Delete Entry",
        "Entry not found",
      );
      expect(mockOnError).toHaveBeenCalledWith("Entry not found");
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("should handle network error when deleting entry", async () => {
      const mockOnSuccess = jest.fn();
      const mockOnError = jest.fn();

      mockApiClient.delete.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useEntryActions({
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      );

      await act(async () => {
        await result.current.deleteEntry("123");
      });

      expect(mockApiClient.delete).toHaveBeenCalledWith("/entries/123");
      expect(showErrorToast).toHaveBeenCalledWith(
        "Failed to Delete Entry",
        "Network error",
      );
      expect(mockOnError).toHaveBeenCalledWith("Network error");
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("should handle unknown error when deleting entry", async () => {
      const mockOnSuccess = jest.fn();
      const mockOnError = jest.fn();

      mockApiClient.delete.mockResolvedValueOnce({
        success: false,
      });

      const { result } = renderHook(() =>
        useEntryActions({
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      );

      await act(async () => {
        await result.current.deleteEntry("123");
      });

      expect(mockApiClient.delete).toHaveBeenCalledWith("/entries/123");
      expect(showErrorToast).toHaveBeenCalledWith(
        "Failed to Delete Entry",
        "Unknown error",
      );
      expect(mockOnError).toHaveBeenCalledWith("Unknown error");
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("should work without callbacks", async () => {
      mockApiClient.delete.mockResolvedValueOnce({
        success: true,
        data: {},
      });

      const { result } = renderHook(() => useEntryActions());

      await act(async () => {
        await result.current.deleteEntry("123");
      });

      expect(mockApiClient.delete).toHaveBeenCalledWith("/entries/123");
      expect(showSuccessToast).toHaveBeenCalledWith(
        "Entry Deleted",
        "Time entry has been deleted successfully",
      );
    });
  });
});
