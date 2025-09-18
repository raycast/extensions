import { showFailureToast } from "@/utils/toast";
import { messages } from "@/locale/en/messages";
import type { CategorizedError } from "../types";

export const RECOVERY_TOAST_MAP: Record<CategorizedError["category"], { title: string; message: string }> = {
  timeout: {
    title: messages.errors.timeoutError,
    message: messages.errors.timeoutRecovery,
  },
  not_found: {
    title: messages.validation.configurationError,
    message: messages.errors.notFoundRecovery,
  },
  permission: {
    title: messages.errors.permissionError,
    message: messages.errors.permissionRecovery,
  },
  authentication: {
    title: messages.errors.authenticationError,
    message: messages.errors.authRecovery,
  },
  parsing: {
    title: messages.errors.processingError,
    message: messages.errors.parsingRecovery,
  },
  unknown: {
    title: messages.errors.processingError,
    message: messages.errors.unknownRecovery,
  },
  network: {
    title: messages.errors.networkError,
    message: messages.errors.networkRecovery,
  },
  configuration: {
    title: messages.errors.configurationError,
    message: messages.errors.configRecovery,
  },
};

export function showCategorizedErrorToast(categorizedError: CategorizedError): void {
  showFailureToast(categorizedError.title, categorizedError.message);
}

export function showRecoveryToast(category: CategorizedError["category"]): void {
  const toastConfig = RECOVERY_TOAST_MAP[category];
  showFailureToast(toastConfig.title, toastConfig.message);
}
