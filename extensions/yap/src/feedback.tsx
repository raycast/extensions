import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  getPreferenceValues,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import ky from "ky";
import { useState } from "react";
import { API_URL } from "x-post";

interface HttpError {
  response?: {
    status: number;
    statusText: string;
    json(): Promise<{ error?: string; details?: string }>;
  };
}

interface FeedbackFormValues {
  feedback: string;
}

export default function SendFeedback() {
  const [feedback, setFeedback] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const preferences = getPreferenceValues<Preferences>();

  // API configuration
  const API_KEY = preferences.apiKey || "";

  async function handleSubmit(values: FeedbackFormValues) {
    if (!values.feedback || values.feedback.trim() === "") {
      showToast({
        style: Toast.Style.Failure,
        title: "Feedback is required",
        message: "Please enter some feedback",
      });
      return;
    }

    if (values.feedback.length > 1000) {
      showToast({
        style: Toast.Style.Failure,
        title: "Feedback too long",
        message: `Your feedback is ${values.feedback.length} characters. Maximum is 1000.`,
      });
      return;
    }

    if (!API_KEY) {
      showToast({
        style: Toast.Style.Failure,
        title: "API Key required",
        message: "Please set your API key in extension preferences",
      });
      return;
    }

    // Show confirmation if enabled
    if (preferences.confirmBeforeSubmitting) {
      const confirmed = await confirmAlert({
        title: "Send Feedback",
        message: `Are you sure you want to send this feedback?\n\n"${values.feedback}"`,
        primaryAction: {
          title: "Send Feedback",
          style: Alert.ActionStyle.Default,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      });

      if (!confirmed) {
        return;
      }
    }

    setIsLoading(true);

    try {
      await submitFeedback(values.feedback);

      await showHUD("Feedback Sent! 🎉");
      setFeedback(""); // Clear the form
    } catch (error) {
      console.error("Failed to send feedback:", error);

      showFailureToast(error, { title: "Failed to send feedback" });
    } finally {
      setIsLoading(false);
    }
  }

  async function submitFeedback(feedback: string): Promise<void> {
    try {
      const response = await ky
        .post(`${API_URL}/api/v1/feedback`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
            "User-Agent": "Raycast Yap Extension",
          },
          json: {
            feedback: feedback.trim(),
          },
        })
        .json<{ success: boolean; message: string; error?: string }>();

      if (!response.success || response.error) {
        throw new Error(response.error || "Failed to submit feedback");
      }

      console.log("Feedback submitted successfully:", response.message);
    } catch (error: unknown) {
      console.error("Failed to submit feedback:", error);

      // Handle specific HTTP errors
      if (error && typeof error === "object" && "response" in error && error.response) {
        const httpError = error as HttpError;
        const status = httpError.response?.status;
        if (status === 401) {
          throw new Error("Invalid API key. Please check your configuration.");
        } else if (status === 403) {
          throw new Error("Access forbidden. Please verify your API permissions.");
        } else if (status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }

        // Try to get error details from response
        try {
          const errorData = await httpError.response?.json();
          throw new Error(
            errorData?.error || errorData?.details || `HTTP ${status}: ${httpError.response?.statusText}`,
          );
        } catch {
          throw new Error(`HTTP ${status}: ${httpError.response?.statusText}`);
        }
      }

      // Re-throw the original error if it's not an HTTP error
      throw error;
    }
  }

  const characterCount = feedback.length;
  const isOverLimit = characterCount > 1000;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Feedback" onSubmit={handleSubmit} icon="💬" />
          <Action
            title="Clear Content"
            onAction={() => setFeedback("")}
            icon="🗑️"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
            icon="⚙️"
            shortcut={{ modifiers: ["cmd"], key: "p" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="feedback"
        title="Feedback"
        placeholder="Share your thoughts, suggestions, or report issues..."
        value={feedback}
        onChange={setFeedback}
      />

      <Form.Description title="Character Count" text={`${characterCount}/1000 ${isOverLimit ? "❌" : "✅"}`} />
    </Form>
  );
}
