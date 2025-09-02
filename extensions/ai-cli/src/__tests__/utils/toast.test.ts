import { beforeEach, describe, expect, it, vi } from "vitest";
import { showToast, Toast } from "@raycast/api";
import { showAnimatedToast, showCustomToast, showFailureToast, showSuccessToast } from "@/utils/toast";
import { expectAnimatedToast, expectFailureToast, expectSuccessToast } from "../test-utils";

// Mock @raycast/api
vi.mock("@raycast/api");

const mockedShowToast = vi.mocked(showToast);

describe("Toast System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Success Toasts", () => {
    it("displays success messages to users", () => {
      const title = "Operation successful";
      const message = "Task completed successfully";

      showSuccessToast(title, message);

      expect(showToast).toHaveBeenCalledWith(expectSuccessToast(title, message));
    });

    it("handles success toast helpers", async () => {
      showSuccessToast("Template Created", "Successfully created template");

      expect(mockedShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Template Created",
        message: "Successfully created template",
      });
    });
  });

  describe("Error Toasts", () => {
    it("displays error messages to users", () => {
      const title = "Operation failed";
      const message = "There was an error processing your request";

      showFailureToast(title, message);

      expect(showToast).toHaveBeenCalledWith(expectFailureToast(title, message));
    });

    it("handles failure toast helpers", async () => {
      showFailureToast("Operation Failed", "Error details");

      expect(mockedShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Operation Failed",
        message: "Error details",
      });
    });
  });

  describe("Loading Toasts", () => {
    it("displays loading messages to users", () => {
      const title = "Processing...";
      const message = "Please wait while we format your text";

      showAnimatedToast(title, message);

      expect(showToast).toHaveBeenCalledWith(expectAnimatedToast(title, message));
    });

    it("handles animated toast helpers", async () => {
      showAnimatedToast("Processing", "Please wait...");

      expect(mockedShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Animated,
        title: "Processing",
        message: "Please wait...",
      });
    });
  });

  describe("Custom Toasts", () => {
    it("displays custom styled messages", () => {
      const style = Toast.Style.Success;
      const title = "Custom notification";
      const message = "Custom message";

      showCustomToast(style, title, message);

      expect(showToast).toHaveBeenCalledWith({
        style,
        title,
        message,
      });
    });

    it("handles custom toast helpers", async () => {
      showCustomToast(Toast.Style.Success, "Custom Success", "Details");

      expect(mockedShowToast).toHaveBeenCalledWith({
        style: Toast.Style.Success,
        title: "Custom Success",
        message: "Details",
      });
    });
  });

  describe("User Workflow Integration", () => {
    beforeEach(() => {
      mockedShowToast.mockClear();
    });

    it("supports typical user workflows", () => {
      mockedShowToast.mockClear(); // Reset at start of test

      // User starts operation
      showAnimatedToast("Formatting text", "Claude is processing your request...");

      expect(mockedShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Animated,
          title: "Formatting text",
          message: "Claude is processing your request...",
        })
      );

      // Operation succeeds
      showSuccessToast("Text formatted", "Your text has been formatted and copied to clipboard");

      expect(mockedShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Success,
          title: "Text formatted",
          message: "Your text has been formatted and copied to clipboard",
        })
      );
    });

    it("handles error scenarios in user workflows", () => {
      mockedShowToast.mockClear(); // Reset at start of test

      // User attempts operation
      showAnimatedToast("Processing");

      expect(mockedShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Animated,
          title: "Processing",
        })
      );

      // Operation fails
      showFailureToast("Processing failed", "Claude API is currently unavailable");

      expect(mockedShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Failure,
          title: "Processing failed",
          message: "Claude API is currently unavailable",
        })
      );
    });
  });

  describe("Message Formatting", () => {
    beforeEach(() => {
      mockedShowToast.mockClear();
    });

    it("templates messages appropriately", () => {
      mockedShowToast.mockClear(); // Reset at start of test

      showSuccessToast("Title", "Message with details");

      expect(mockedShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Success,
          title: "Title",
          message: "Message with details",
        })
      );

      showFailureToast("Error", 'Error with "quotes" and symbols');

      expect(mockedShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Failure,
          title: "Error",
          message: 'Error with "quotes" and symbols',
        })
      );
    });

    it("handles optional messages", () => {
      mockedShowToast.mockClear(); // Reset at start of test

      showSuccessToast("Title only");

      expect(mockedShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Success,
          title: "Title only",
          message: undefined,
        })
      );

      showFailureToast("Error only");

      expect(mockedShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Failure,
          title: "Error only",
          message: undefined,
        })
      );
    });
  });
});
