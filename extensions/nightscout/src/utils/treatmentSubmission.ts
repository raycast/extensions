import { showToast, Toast, popToRoot } from "@raycast/api";
import { treatmentService, getTreatmentConfig } from "../services/treatmentService";
import { Treatment, AppError } from "../types";
import { handleAppError } from "./errorHandling";

/**
 * Utility function to handle treatment submission with toast messages and error handling
 */
export async function submitTreatment(treatmentData: Partial<Treatment>, successMessage: string): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Submitting treatment...",
  });

  try {
    const config = getTreatmentConfig();

    const result = await treatmentService.submitTreatments(config, [treatmentData]);

    if (result.success) {
      await toast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Treatment Added",
        message: successMessage,
      });
      popToRoot();
    }
  } catch (error) {
    // only handle unexpected errors here
    const isAppError = (err: unknown): err is AppError => {
      return typeof err === "object" && err !== null && "type" in err;
    };

    if (!isAppError(error)) {
      await handleAppError(
        {
          type: "connection",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          instanceUrl: "unknown",
        },
        "treatment submission",
      );
    }
  }
}
