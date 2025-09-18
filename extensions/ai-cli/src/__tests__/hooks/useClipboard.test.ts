import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useClipboard } from "@/hooks/useClipboard";
import { Clipboard, showToast } from "@raycast/api";
import { expectFailureToast } from "../test-utils";
// import { CLAUDE_AUTH_TOKEN_PREFIX } from "@/constants";
const CLAUDE_AUTH_TOKEN_PREFIX = "sk-ant";

const mockClipboard = { readText: vi.mocked(Clipboard.readText) };
const mockShowToast = vi.mocked(showToast);

describe("useClipboard", () => {
  describe("Clipboard Access", () => {
    it("loads clipboard content successfully", async () => {
      const testText = "Sample clipboard content";
      mockClipboard.readText.mockResolvedValue(testText);

      const { result } = renderHook(() => useClipboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.clipboardText).toBe(testText);
    });

    it("handles clipboard access failure", async () => {
      const testError = new Error("Clipboard access denied");
      mockClipboard.readText.mockRejectedValue(testError);

      const { result } = renderHook(() => useClipboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.clipboardText).toBe("");
      expect(mockShowToast).toHaveBeenCalledWith(expectFailureToast("Clipboard Access Failed", expect.any(String)));
    });

    it("filters out Claude authentication tokens", async () => {
      const claudeToken = `${CLAUDE_AUTH_TOKEN_PREFIX}-123456789`;
      mockClipboard.readText.mockResolvedValue(claudeToken);

      const { result } = renderHook(() => useClipboard());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.clipboardText).toBe("");
    });
  });
});
