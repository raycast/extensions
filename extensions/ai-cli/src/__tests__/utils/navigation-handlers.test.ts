import { describe, expect, it, vi } from "vitest";
import { launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@/utils/toast";
import { createNavigationHandler } from "@/navigation/navigation-handlers";

vi.mock("../../utils/toast", () => ({
  showFailureToast: vi.fn(),
}));

describe("navigation-handlers", () => {
  describe("User Navigation Actions", () => {
    it("creates navigation handler for user actions", () => {
      const handler = createNavigationHandler("manage-templates");
      expect(typeof handler).toBe("function");
    });

    it("launches commands for user navigation", async () => {
      vi.mocked(launchCommand).mockResolvedValue();

      const handler = createNavigationHandler("manage-templates");
      await handler();

      expect(launchCommand).toHaveBeenCalledWith({
        name: "manage-templates",
        type: LaunchType.UserInitiated,
      });
      expect(showFailureToast).not.toHaveBeenCalled();
    });

    it("handles different navigation targets", async () => {
      vi.mocked(launchCommand).mockResolvedValue();

      const formatHandler = createNavigationHandler("manage-templates");
      const toneHandler = createNavigationHandler("manage-tones");

      await formatHandler();
      await toneHandler();

      expect(launchCommand).toHaveBeenNthCalledWith(1, {
        name: "manage-templates",
        type: LaunchType.UserInitiated,
      });
      expect(launchCommand).toHaveBeenNthCalledWith(2, {
        name: "manage-tones",
        type: LaunchType.UserInitiated,
      });
    });
  });

  describe("Navigation Error Handling", () => {
    it("shows error feedback when navigation fails", async () => {
      const error = new Error("Command failed");
      vi.mocked(launchCommand).mockRejectedValue(error);

      const handler = createNavigationHandler(
        "manage-templates",
        "Failed to open Manage Templates",
        "Could not launch the Manage Templates command"
      );
      await handler();

      expect(showFailureToast).toHaveBeenCalledWith(
        "Failed to open Manage Templates",
        "Could not launch the Manage Templates command"
      );
    });

    it("shows fallback error feedback when no custom messages provided", async () => {
      const error = new Error("Command failed");
      vi.mocked(launchCommand).mockRejectedValue(error);

      const handler = createNavigationHandler("manage-templates");
      await handler();

      expect(showFailureToast).toHaveBeenCalledWith("Navigation Failed", "Could not launch command: manage-templates");
    });

    it("handles partial error configuration", async () => {
      const error = new Error("Command failed");
      vi.mocked(launchCommand).mockRejectedValue(error);

      const handler = createNavigationHandler("test-command", "Error Title");
      await handler();

      expect(showFailureToast).toHaveBeenCalledWith("Error Title", "Could not launch command: test-command");
    });
  });

  describe("User Navigation Workflows", () => {
    it("supports typical user navigation between commands", async () => {
      vi.mocked(launchCommand).mockResolvedValue();

      // User navigates from format text to manage templates
      const navigateToTemplates = createNavigationHandler("manage-templates");
      await navigateToTemplates();

      // User navigates to manage tones
      const navigateToTones = createNavigationHandler("manage-tones");
      await navigateToTones();

      expect(launchCommand).toHaveBeenCalledTimes(2);
      expect(showFailureToast).not.toHaveBeenCalled();
    });

    it("handles navigation failures gracefully in user workflows", async () => {
      vi.mocked(launchCommand).mockRejectedValue(new Error("Network error"));

      const handler = createNavigationHandler("manage-templates", "Navigation Error", "Please try again");

      // User attempts navigation
      await handler();

      // User sees error feedback
      expect(showFailureToast).toHaveBeenCalledWith("Navigation Error", "Please try again");
    });
  });
});
