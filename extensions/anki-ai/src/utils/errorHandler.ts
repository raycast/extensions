import { Logger } from "./logger";
import { showToast, Toast } from "@raycast/api";

export class ErrorHandler {
  static handle(error: unknown, message: string) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`${message}: ${errorMessage}`, error);

    // Show error toast to the user
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: message || "An unexpected error occurred",
    });
  }

  static handleAnkiConnectionError() {
    const message =
      "Could not connect to Anki. Make sure Anki is open and AnkiConnect is properly installed. Restart Anki if necessary.";
    Logger.error(message);

    showToast({
      style: Toast.Style.Failure,
      title: "Anki Connection Error",
      message,
    });
  }

  static handleAIError(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const message = "Error generating flashcards with AI";
    Logger.error(`${message}: ${errorMessage}`, error);

    // Determine a more specific message based on the error
    let userMessage = "Could not generate flashcards. ";

    if (errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("connection")) {
      userMessage += "Internet connection problem. Check your connection and try again.";
    } else if (errorMessage.includes("quota") || errorMessage.includes("limit") || errorMessage.includes("rate")) {
      userMessage += "Request limit reached. Try again later.";
    } else if (
      errorMessage.includes("authentication") ||
      errorMessage.includes("auth") ||
      errorMessage.includes("key")
    ) {
      userMessage += "API authentication problem. Check your credentials.";
    } else if (errorMessage.includes("parse") || errorMessage.includes("JSON")) {
      userMessage += "Problem processing the AI response. Try with a different or shorter text.";
    } else {
      userMessage += "Try again with a different or shorter text.";
    }

    showToast({
      style: Toast.Style.Failure,
      title: "Flashcard Generation Error",
      message: userMessage,
    });
  }
}
