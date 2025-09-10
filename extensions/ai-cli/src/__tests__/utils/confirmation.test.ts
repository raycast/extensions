import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmAlert } from "@raycast/api";
import { showFailureToast, showSuccessToast } from "@/utils/toast";
import { confirmDeletion, executeDeleteOperation } from "@/utils/confirmation";
import { messages } from "@/locale/en/messages";

vi.mock("../../utils/toast", () => ({
  showSuccessToast: vi.fn(),
  showFailureToast: vi.fn(),
}));

describe("confirmation", () => {
  describe("User Confirmation Flow", () => {
    it("shows confirmation dialog for user deletion requests", async () => {
      vi.mocked(confirmAlert).mockResolvedValue(true);

      const result = await confirmDeletion("Template", "My Custom Template");

      expect(confirmAlert).toHaveBeenCalledWith({
        title: "Delete Template",
        message: 'Are you sure you want to delete "My Custom Template"? This action cannot be undone.',
        primaryAction: {
          title: messages.confirmations.deleteButton,
          style: "destructive",
        },
      });
      expect(result).toBe(true);
    });

    it("handles user confirmation acceptance", async () => {
      vi.mocked(confirmAlert).mockResolvedValue(true);

      const result = await confirmDeletion("Tone", "Professional Tone");

      expect(result).toBe(true);
    });

    it("handles user confirmation cancellation", async () => {
      vi.mocked(confirmAlert).mockResolvedValue(false);

      const result = await confirmDeletion("Template", "Slack Template");

      expect(result).toBe(false);
    });
  });

  describe("Delete Operation Execution", () => {
    const mockDeleteOperation = vi.fn();

    beforeEach(() => {
      mockDeleteOperation.mockClear();
    });

    it("executes delete operation and shows success feedback", async () => {
      mockDeleteOperation.mockResolvedValue(undefined);

      await executeDeleteOperation("Template", "My Template", mockDeleteOperation);

      expect(mockDeleteOperation).toHaveBeenCalledOnce();
      expect(showSuccessToast).toHaveBeenCalledWith("Template Deleted", 'Successfully deleted "My Template"');
      expect(showFailureToast).not.toHaveBeenCalled();
    });

    it("handles delete operation failures with error feedback", async () => {
      const error = new Error("Database connection failed");
      mockDeleteOperation.mockRejectedValue(error);

      await executeDeleteOperation("Tone", "Professional", mockDeleteOperation);

      expect(mockDeleteOperation).toHaveBeenCalledOnce();
      expect(showFailureToast).toHaveBeenCalledWith("Failed to Delete Tone", "Database connection failed");
      expect(showSuccessToast).not.toHaveBeenCalled();
    });

    it("handles unknown errors with generic feedback", async () => {
      mockDeleteOperation.mockRejectedValue("String error");

      await executeDeleteOperation("Template", "Custom", mockDeleteOperation);

      expect(showFailureToast).toHaveBeenCalledWith("Failed to Delete Template", messages.generic.unexpectedError);
    });
  });

  describe("Complete User Workflow", () => {
    it("handles full confirmation and deletion workflow", async () => {
      const mockDeleteOperation = vi.fn().mockResolvedValue(undefined);
      vi.mocked(confirmAlert).mockResolvedValue(true);

      // User confirms deletion
      const confirmed = await confirmDeletion("Template", "My Custom Template");
      expect(confirmed).toBe(true);

      if (confirmed) {
        await executeDeleteOperation("Template", "My Custom Template", mockDeleteOperation);
      }

      expect(mockDeleteOperation).toHaveBeenCalledOnce();
      expect(showSuccessToast).toHaveBeenCalledWith("Template Deleted", 'Successfully deleted "My Custom Template"');
    });

    it("handles workflow cancellation", async () => {
      const mockDeleteOperation = vi.fn();
      vi.mocked(confirmAlert).mockResolvedValue(false);

      // User cancels deletion
      const confirmed = await confirmDeletion("Format", "My Custom Format");
      expect(confirmed).toBe(false);

      if (confirmed) {
        await executeDeleteOperation("Format", "My Custom Format", mockDeleteOperation);
      }

      // Delete operation should not be called
      expect(mockDeleteOperation).not.toHaveBeenCalled();
      expect(showSuccessToast).not.toHaveBeenCalled();
      expect(showFailureToast).not.toHaveBeenCalled();
    });
  });
});
