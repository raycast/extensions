/**
 * Tests for actions utilities.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { copyToClipboard, createCopyHandler } from "./actions";
import { Clipboard, showHUD } from "@raycast/api";

describe("actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("copyToClipboard", () => {
    it("copies text to clipboard", async () => {
      await copyToClipboard("test-text", "Test Label");

      expect(Clipboard.copy).toHaveBeenCalledWith("test-text");
    });

    it("shows HUD with label after copying", async () => {
      await copyToClipboard("NL00BUNQ0000000001", "IBAN");

      expect(showHUD).toHaveBeenCalledWith("Copied IBAN");
    });

    it("handles empty text", async () => {
      await copyToClipboard("", "Empty");

      expect(Clipboard.copy).toHaveBeenCalledWith("");
      expect(showHUD).toHaveBeenCalledWith("Copied Empty");
    });

    it("handles special characters in text", async () => {
      const specialText = "€100.00 (payment)";
      await copyToClipboard(specialText, "amount");

      expect(Clipboard.copy).toHaveBeenCalledWith(specialText);
      expect(showHUD).toHaveBeenCalledWith("Copied amount");
    });

    it("handles multiline text", async () => {
      const multilineText = "Line 1\nLine 2\nLine 3";
      await copyToClipboard(multilineText, "text");

      expect(Clipboard.copy).toHaveBeenCalledWith(multilineText);
    });
  });

  describe("createCopyHandler", () => {
    it("returns a function", () => {
      const handler = createCopyHandler("text", "label");

      expect(typeof handler).toBe("function");
    });

    it("returned function calls copyToClipboard with correct arguments", async () => {
      const handler = createCopyHandler("test-value", "Test");

      await handler();

      expect(Clipboard.copy).toHaveBeenCalledWith("test-value");
      expect(showHUD).toHaveBeenCalledWith("Copied Test");
    });

    it("can be called multiple times", async () => {
      const handler = createCopyHandler("value", "label");

      await handler();
      await handler();

      expect(Clipboard.copy).toHaveBeenCalledTimes(2);
      expect(showHUD).toHaveBeenCalledTimes(2);
    });

    it("creates independent handlers", async () => {
      const handler1 = createCopyHandler("value1", "Label1");
      const handler2 = createCopyHandler("value2", "Label2");

      await handler1();

      expect(Clipboard.copy).toHaveBeenCalledWith("value1");
      expect(showHUD).toHaveBeenCalledWith("Copied Label1");

      await handler2();

      expect(Clipboard.copy).toHaveBeenLastCalledWith("value2");
      expect(showHUD).toHaveBeenLastCalledWith("Copied Label2");
    });
  });
});
