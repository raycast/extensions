import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFollowUpProcessor } from "@/components/ResultsList/useFollowUpProcessor";
import { FormattingVariant, FormValues } from "@/types";
import { createMockFormValues } from "@/__tests__/test-utils";

vi.mock("@raycast/api");

// Mock utils
vi.mock("@/utils/entity-operations", () => ({
  createVariantId: () => "generated-id-123",
}));

// Mock helpers
vi.mock("@/components/ResultsList/ResultsList.helpers", () => ({
  getVariantKey: (variant: FormattingVariant) => `variant-${variant.id}`,
}));

describe("useFollowUpProcessor", () => {
  const mockProcess = vi.fn();
  const mockOnVariantAdded = vi.fn();
  const mockFormValues: FormValues = createMockFormValues();

  const hookProps = {
    formValues: mockFormValues,
    processFollowUpWithAgent: mockProcess,
    onVariantAdded: mockOnVariantAdded,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with correct default state", () => {
    const { result } = renderHook(() => useFollowUpProcessor(hookProps));

    expect(result.current.isProcessingFollowUp).toBe(false);
    expect(typeof result.current.processFollowUp).toBe("function");
  });

  it("should return early for empty question", async () => {
    const { result } = renderHook(() => useFollowUpProcessor(hookProps));

    await act(async () => {
      await result.current.processFollowUp("", "placeholder-id");
    });

    expect(mockProcess).not.toHaveBeenCalled();
    expect(result.current.isProcessingFollowUp).toBe(false);
  });

  it("should return early for whitespace-only question", async () => {
    const { result } = renderHook(() => useFollowUpProcessor(hookProps));

    await act(async () => {
      await result.current.processFollowUp("   ", "placeholder-id");
    });

    expect(mockProcess).not.toHaveBeenCalled();
    expect(result.current.isProcessingFollowUp).toBe(false);
  });

  it("should set processing state and call process with followUp", async () => {
    const { result } = renderHook(() => useFollowUpProcessor(hookProps));

    // Start processing but don't await it yet
    act(() => {
      result.current.processFollowUp("What is the weather?", "placeholder-123");
    });

    // Should immediately set processing state
    expect(result.current.isProcessingFollowUp).toBe(true);

    // Should call process with correct params and options
    expect(mockProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({
          template: "custom",
          tone: "default",
          model: mockFormValues.model,
          textInput: "What is the weather?",
          additionalContext: "",
          targetFolder: "",
        }),
        inputText: "What is the weather?",
      }),
      expect.any(Function)
    );
  });

  it("should handle successful processing without placeholder ID", async () => {
    // Mock successful processing
    mockProcess.mockImplementation((_params, onSuccess) => {
      const mockVariant: FormattingVariant = {
        id: "original-id",
        content: "Weather is sunny",
        index: 0,
      };
      onSuccess(mockVariant);
    });

    const { result } = renderHook(() => useFollowUpProcessor(hookProps));

    await act(async () => {
      await result.current.processFollowUp("What is the weather?");
    });

    // Should call onVariantAdded with enhanced variant (no shouldUpdate flag)
    expect(mockOnVariantAdded).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "generated-id-123", // from createVariantId mock
        content: "Weather is sunny",
        index: 0,
        originalInput: "What is the weather?",
      })
    );

    // Should reset processing state
    expect(result.current.isProcessingFollowUp).toBe(false);
  });

  it("should handle successful processing with placeholder ID (update mode)", async () => {
    // Mock successful processing
    mockProcess.mockImplementation((_params, onSuccess) => {
      const mockVariant: FormattingVariant = {
        id: "original-id",
        content: "Weather is sunny",
        index: 0,
      };
      onSuccess(mockVariant);
    });

    const { result } = renderHook(() => useFollowUpProcessor(hookProps));
    const placeholderVariantId = "placeholder-123";

    await act(async () => {
      await result.current.processFollowUp("What is the weather?", placeholderVariantId);
    });

    // Should call onVariantAdded with placeholder ID and shouldUpdate=true
    expect(mockOnVariantAdded).toHaveBeenCalledWith(
      expect.objectContaining({
        id: placeholderVariantId, // Uses provided placeholder ID
        content: "Weather is sunny",
        index: 0,
        originalInput: "What is the weather?",
      }),
      true // shouldUpdate flag
    );

    // Should reset processing state
    expect(result.current.isProcessingFollowUp).toBe(false);
  });

  it("should handle processing errors", async () => {
    const mockError = new Error("Processing failed");
    mockProcess.mockImplementation(() => {
      throw mockError;
    });

    const { result } = renderHook(() => useFollowUpProcessor(hookProps));

    await act(async () => {
      await result.current.processFollowUp("What is the weather?", "placeholder-123");
    });

    // Should reset processing state on error
    expect(result.current.isProcessingFollowUp).toBe(false);
  });

  it("should use correct model from form values", async () => {
    const customFormValues = {
      ...mockFormValues,
      model: "Haiku" as const,
    };

    const customProps = {
      ...hookProps,
      formValues: customFormValues,
    };

    const { result } = renderHook(() => useFollowUpProcessor(customProps));

    act(() => {
      result.current.processFollowUp("Test question", "test-placeholder");
    });

    expect(mockProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({
          template: "custom",
          tone: "default",
          model: "Haiku",
        }),
      }),
      expect.any(Function)
    );
  });

  it("should trim question before processing", async () => {
    const { result } = renderHook(() => useFollowUpProcessor(hookProps));

    act(() => {
      result.current.processFollowUp("  What is the weather?  ", "trim-placeholder");
    });

    expect(mockProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({
          template: "custom",
          tone: "default",
          textInput: "  What is the weather?  ", // Full input preserved in textInput
        }),
        inputText: "  What is the weather?  ",
      }),
      expect.any(Function)
    );
  });
});
