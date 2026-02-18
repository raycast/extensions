/**
 * Tests for useFormSubmit hook.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormSubmit } from "./useFormSubmit";
import { showToast, Toast, popToRoot } from "@raycast/api";

vi.mock("@raycast/api", async () => {
  const actual = await vi.importActual("@raycast/api");
  return {
    ...actual,
    showToast: vi.fn(() => Promise.resolve({ primaryAction: null })),
    popToRoot: vi.fn(() => Promise.resolve()),
    open: vi.fn(() => Promise.resolve()),
    Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
  };
});

describe("useFormSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("returns isSubmitting as false initially", () => {
      const { result } = renderHook(() =>
        useFormSubmit({
          onSubmit: vi.fn(),
        }),
      );

      expect(result.current.isSubmitting).toBe(false);
    });

    it("returns submit function", () => {
      const { result } = renderHook(() =>
        useFormSubmit({
          onSubmit: vi.fn(),
        }),
      );

      expect(typeof result.current.submit).toBe("function");
    });
  });

  describe("successful submission", () => {
    it("shows loading toast during submission", async () => {
      const onSubmit = vi.fn(() => Promise.resolve("result"));

      const { result } = renderHook(() =>
        useFormSubmit({
          onSubmit,
          loadingMessage: "Creating payment...",
        }),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(showToast).toHaveBeenCalledWith({
        style: Toast.Style.Animated,
        title: "Creating payment...",
      });
    });

    it("shows success toast after completion", async () => {
      const onSubmit = vi.fn(() => Promise.resolve("result"));

      const { result } = renderHook(() =>
        useFormSubmit({
          onSubmit,
          successMessage: "Payment created!",
        }),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Success,
          title: "Payment created!",
        }),
      );
    });

    it("shows success toast with description when provided", async () => {
      const onSubmit = vi.fn(() => Promise.resolve("result"));

      const { result } = renderHook(() =>
        useFormSubmit({
          onSubmit,
          successMessage: "Done!",
          successDescription: "Your payment was sent",
        }),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Success,
          title: "Done!",
          message: "Your payment was sent",
        }),
      );
    });

    it("returns to root by default", async () => {
      const onSubmit = vi.fn(() => Promise.resolve("result"));

      const { result } = renderHook(() =>
        useFormSubmit({
          onSubmit,
        }),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(popToRoot).toHaveBeenCalled();
    });

    it("does not return to root when returnToRoot is false", async () => {
      const onSubmit = vi.fn(() => Promise.resolve("result"));

      const { result } = renderHook(() =>
        useFormSubmit({
          onSubmit,
          returnToRoot: false,
        }),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(popToRoot).not.toHaveBeenCalled();
    });

    it("uses default messages when not provided", async () => {
      const onSubmit = vi.fn(() => Promise.resolve("result"));

      const { result } = renderHook(() =>
        useFormSubmit({
          onSubmit,
        }),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(showToast).toHaveBeenCalledWith({
        style: Toast.Style.Animated,
        title: "Submitting...",
      });

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Success,
          title: "Success",
        }),
      );
    });
  });

  describe("failed submission", () => {
    it("shows failure toast on error", async () => {
      const onSubmit = vi.fn(() => Promise.reject(new Error("Network error")));

      const { result } = renderHook(() =>
        useFormSubmit({
          onSubmit,
        }),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Failure,
          title: "Failed",
          message: "Network error",
        }),
      );
    });

    it("does not return to root on error", async () => {
      const onSubmit = vi.fn(() => Promise.reject(new Error("Error")));

      const { result } = renderHook(() =>
        useFormSubmit({
          onSubmit,
        }),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(popToRoot).not.toHaveBeenCalled();
    });
  });

  describe("submitting state", () => {
    it("isSubmitting is false after successful submission", async () => {
      const onSubmit = vi.fn(() => Promise.resolve("result"));

      const { result } = renderHook(() =>
        useFormSubmit({
          onSubmit,
        }),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.isSubmitting).toBe(false);
    });

    it("isSubmitting is false after failed submission", async () => {
      const onSubmit = vi.fn(() => Promise.reject(new Error("Error")));

      const { result } = renderHook(() =>
        useFormSubmit({
          onSubmit,
        }),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe("open URL option", () => {
    it("sets primary action on toast when openUrl is provided", async () => {
      const mockToast = { primaryAction: null as { title: string; onAction: () => void } | null };
      vi.mocked(showToast).mockImplementation(async (opts) => {
        const options = opts as unknown as { style?: Toast.Style };
        if (options && options.style === Toast.Style.Success) {
          return mockToast as unknown as Toast;
        }
        return {} as unknown as Toast;
      });

      const onSubmit = vi.fn(() => Promise.resolve("result"));

      const { result } = renderHook(() =>
        useFormSubmit({
          onSubmit,
          openUrl: "https://example.com",
          openUrlTitle: "View",
        }),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(mockToast.primaryAction).not.toBeNull();
      expect(mockToast.primaryAction?.title).toBe("View");
    });
  });
});
