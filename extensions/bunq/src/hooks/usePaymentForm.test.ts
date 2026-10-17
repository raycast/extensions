/**
 * Tests for usePaymentForm hook.
 *
 * These tests verify our hook's business logic:
 * - Form validation rules and error messages
 * - Pointer type detection (EMAIL, PHONE, IBAN)
 * - Form submission flow with toast notifications
 * - Reset functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePaymentForm, useFormSubmit } from "./usePaymentForm";
import type { MonetaryAccount } from "../api/endpoints";

// Mock Raycast API
vi.mock("@raycast/api", async () => {
  const actual = await vi.importActual("@raycast/api");
  return {
    ...actual,
    showToast: vi.fn(() => Promise.resolve()),
    Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
  };
});

const createMockAccount = (id: number, description: string): MonetaryAccount => ({
  id,
  description,
  status: "ACTIVE",
  balance: { value: "1000.00", currency: "EUR" },
  currency: "EUR",
  alias: [],
  created: "2024-01-01",
  updated: "2024-01-01",
  accountType: "MonetaryAccountBank",
});

describe("usePaymentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("reset", () => {
    it("resets all values to empty", () => {
      const { result } = renderHook(() => usePaymentForm());

      act(() => {
        result.current.setters.setSelectedAccountId("123");
        result.current.setters.setAmount("50.00");
        result.current.setters.setRecipient("test@example.com");
        result.current.setters.setRecipientName("John");
        result.current.setters.setDescription("Test");
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.values.selectedAccountId).toBe("");
      expect(result.current.values.amount).toBe("");
      expect(result.current.values.recipient).toBe("");
      expect(result.current.values.recipientName).toBe("");
      expect(result.current.values.description).toBe("");
    });
  });

  describe("validate", () => {
    it("returns error when account is not selected", () => {
      const { result } = renderHook(() => usePaymentForm());

      const validation = result.current.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Please select an account");
    });

    it("returns error when amount is empty", () => {
      const { result } = renderHook(() => usePaymentForm());

      act(() => {
        result.current.setters.setSelectedAccountId("123");
      });

      const validation = result.current.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Please enter an amount");
    });

    it("returns error when amount is invalid", () => {
      const { result } = renderHook(() => usePaymentForm());

      act(() => {
        result.current.setters.setSelectedAccountId("123");
        result.current.setters.setAmount("invalid");
      });

      const validation = result.current.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Invalid amount");
    });

    it("returns error when amount is zero", () => {
      const { result } = renderHook(() => usePaymentForm());

      act(() => {
        result.current.setters.setSelectedAccountId("123");
        result.current.setters.setAmount("0");
      });

      const validation = result.current.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Invalid amount");
    });

    it("returns error when amount is negative", () => {
      const { result } = renderHook(() => usePaymentForm());

      act(() => {
        result.current.setters.setSelectedAccountId("123");
        result.current.setters.setAmount("-50");
      });

      const validation = result.current.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Invalid amount");
    });

    it("returns error when recipient is empty", () => {
      const { result } = renderHook(() => usePaymentForm());

      act(() => {
        result.current.setters.setSelectedAccountId("123");
        result.current.setters.setAmount("50.00");
      });

      const validation = result.current.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Please enter a recipient");
    });

    it("returns error when description is empty (by default)", () => {
      const { result } = renderHook(() => usePaymentForm());

      act(() => {
        result.current.setters.setSelectedAccountId("123");
        result.current.setters.setAmount("50.00");
        result.current.setters.setRecipient("test@example.com");
      });

      const validation = result.current.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Please enter a description");
    });

    it("does not require description when requireDescription is false", () => {
      const { result } = renderHook(() => usePaymentForm());

      act(() => {
        result.current.setters.setSelectedAccountId("123");
        result.current.setters.setAmount("50.00");
        result.current.setters.setRecipient("test@example.com");
      });

      const validation = result.current.validate({ requireDescription: false });

      expect(validation.isValid).toBe(true);
    });

    it("returns valid result with complete data", () => {
      const { result } = renderHook(() => usePaymentForm());

      act(() => {
        result.current.setters.setSelectedAccountId("123");
        result.current.setters.setAmount("50.00");
        result.current.setters.setRecipient("test@example.com");
        result.current.setters.setDescription("Test payment");
      });

      const validation = result.current.validate();

      expect(validation.isValid).toBe(true);
      expect(validation.data).toBeDefined();
      expect(validation.data?.accountId).toBe(123);
      expect(validation.data?.amount.value).toBe("50.00");
      expect(validation.data?.amount.currency).toBe("EUR");
      expect(validation.data?.counterpartyAlias.value).toBe("test@example.com");
      expect(validation.data?.description).toBe("Test payment");
    });

    it("detects email pointer type", () => {
      const { result } = renderHook(() => usePaymentForm());

      act(() => {
        result.current.setters.setSelectedAccountId("123");
        result.current.setters.setAmount("50.00");
        result.current.setters.setRecipient("user@example.com");
        result.current.setters.setDescription("Test");
      });

      const validation = result.current.validate();

      expect(validation.data?.counterpartyAlias.type).toBe("EMAIL");
    });

    it("detects phone pointer type", () => {
      const { result } = renderHook(() => usePaymentForm());

      act(() => {
        result.current.setters.setSelectedAccountId("123");
        result.current.setters.setAmount("50.00");
        result.current.setters.setRecipient("+31612345678");
        result.current.setters.setDescription("Test");
      });

      const validation = result.current.validate();

      expect(validation.data?.counterpartyAlias.type).toBe("PHONE_NUMBER");
    });

    it("detects IBAN pointer type", () => {
      const { result } = renderHook(() => usePaymentForm());

      act(() => {
        result.current.setters.setSelectedAccountId("123");
        result.current.setters.setAmount("50.00");
        result.current.setters.setRecipient("NL91ABNA0417164300");
        result.current.setters.setDescription("Test");
      });

      const validation = result.current.validate();

      expect(validation.data?.counterpartyAlias.type).toBe("IBAN");
    });

    it("includes recipient name when provided", () => {
      const { result } = renderHook(() => usePaymentForm());

      act(() => {
        result.current.setters.setSelectedAccountId("123");
        result.current.setters.setAmount("50.00");
        result.current.setters.setRecipient("test@example.com");
        result.current.setters.setRecipientName("John Doe");
        result.current.setters.setDescription("Test");
      });

      const validation = result.current.validate();

      expect(validation.data?.counterpartyAlias.name).toBe("John Doe");
    });

    it("finds selected account in accounts list", () => {
      const accounts = [createMockAccount(123, "Main Account"), createMockAccount(456, "Savings")];

      const { result } = renderHook(() => usePaymentForm(accounts));

      act(() => {
        result.current.setters.setSelectedAccountId("123");
        result.current.setters.setAmount("50.00");
        result.current.setters.setRecipient("test@example.com");
        result.current.setters.setDescription("Test");
      });

      const validation = result.current.validate();

      expect(validation.data?.selectedAccount).toBeDefined();
      expect(validation.data?.selectedAccount?.id).toBe(123);
      expect(validation.data?.selectedAccount?.description).toBe("Main Account");
    });
  });

  describe("validateAndShowError", () => {
    it("shows toast on validation error", async () => {
      const { showToast } = await import("@raycast/api");
      const { result } = renderHook(() => usePaymentForm());

      let validatedData: unknown;
      await act(async () => {
        validatedData = await result.current.validateAndShowError();
      });

      expect(validatedData).toBeNull();
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Missing fields",
        }),
      );
    });

    it("returns data on successful validation", async () => {
      const { result } = renderHook(() => usePaymentForm());

      act(() => {
        result.current.setters.setSelectedAccountId("123");
        result.current.setters.setAmount("50.00");
        result.current.setters.setRecipient("test@example.com");
        result.current.setters.setDescription("Test");
      });

      let validatedData: unknown;
      await act(async () => {
        validatedData = await result.current.validateAndShowError();
      });

      expect(validatedData).not.toBeNull();
    });
  });
});

describe("useFormSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits successfully and returns result", async () => {
    const { showToast } = await import("@raycast/api");
    const { result } = renderHook(() => useFormSubmit());

    const action = vi.fn().mockResolvedValue({ id: 123 });
    const onSuccess = vi.fn();

    let submitResult: unknown;
    await act(async () => {
      submitResult = await result.current.submit({
        action,
        loadingMessage: "Loading...",
        successMessage: "Success!",
        errorTitle: "Error",
        onSuccess,
      });
    });

    expect(submitResult).toEqual({ id: 123 });
    expect(action).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith({ id: 123 });
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Success!",
      }),
    );
  });

  it("handles submission error", async () => {
    const { showToast } = await import("@raycast/api");
    const { result } = renderHook(() => useFormSubmit());

    const action = vi.fn().mockRejectedValue(new Error("Submission failed"));

    let submitResult: unknown;
    await act(async () => {
      submitResult = await result.current.submit({
        action,
        loadingMessage: "Loading...",
        successMessage: "Success!",
        errorTitle: "Error",
      });
    });

    expect(submitResult).toBeNull();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error",
        message: "Submission failed",
      }),
    );
  });

  it("resets isSubmitting after successful submission", async () => {
    const { result } = renderHook(() => useFormSubmit());

    const action = vi.fn().mockResolvedValue({ id: 1 });

    await act(async () => {
      await result.current.submit({
        action,
        loadingMessage: "Loading...",
        successMessage: "Success!",
        errorTitle: "Error",
      });
    });

    expect(action).toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("resets isSubmitting after error", async () => {
    const { result } = renderHook(() => useFormSubmit());

    const action = vi.fn().mockRejectedValue(new Error("Failed"));

    await act(async () => {
      await result.current.submit({
        action,
        loadingMessage: "Loading...",
        successMessage: "Success!",
        errorTitle: "Error",
      });
    });

    expect(result.current.isSubmitting).toBe(false);
  });
});
