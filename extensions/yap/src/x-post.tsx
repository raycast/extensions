import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  environment,
  Form,
  getPreferenceValues,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import ky from "ky";
import { useState } from "react";
import SendFeedback from "./feedback";

interface HttpError {
  response?: {
    status: number;
    statusText: string;
    json(): Promise<{ error?: string; details?: string }>;
  };
}

interface Preferences {
  confirmBeforePosting: boolean;
  apiKey: string;
}

interface TweetFormValues {
  content: string;
}

export const API_URL = environment.isDevelopment ? "http://localhost:3000" : "https://app.yap.ac";

export default function Command() {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();

  async function handleSubmit(values: TweetFormValues) {
    if (!values.content || values.content.trim() === "") {
      showToast({
        style: Toast.Style.Failure,
        title: "Post content is required",
        message: "Please enter some content for your post",
      });
      return;
    }

    if (values.content.length > 280) {
      showToast({
        style: Toast.Style.Failure,
        title: "Post too long",
        message: `Your post is ${values.content.length} characters. Maximum is 280.`,
      });
      return;
    }

    // Show confirmation if enabled
    if (preferences.confirmBeforePosting) {
      const confirmed = await confirmAlert({
        title: "Post on X ",
        message: `Are you sure you want to post this post on X?\n\n"${values.content}"`,
        primaryAction: {
          title: "Post on X",
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

    if (!preferences.apiKey) {
      showToast({
        style: Toast.Style.Failure,
        title: "API Key is not set",
        message: "Please set your API key in the extension preferences",
      });
      return;
    }

    setIsLoading(true);

    try {
      await postTweet(values.content, preferences.apiKey);

      await showHUD("Post Successful! 🎉");
      setContent("");
    } catch (error) {
      showFailureToast("Failed to post on X: " + error);
    } finally {
      setIsLoading(false);
    }
  }

  async function postTweet(content: string, apiKey: string): Promise<void> {
    try {
      const response = await ky
        .post(`${API_URL}/api/v1/posts/x`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "User-Agent": "Raycast Yap Extension",
          },
          json: {
            text: content.trim(),
          },
        })
        .json<{ success: boolean; taskId: string; message: string; error?: string }>();

      if (!response.success || response.error) {
        throw new Error(response.error || "Failed to post tweet");
      }
    } catch (error: unknown) {
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

  const characterCount = content.length;
  const isOverLimit = characterCount > 280;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Post Tweet" onSubmit={handleSubmit} icon="📝" />
          <Action
            title="Clear Content"
            onAction={() => setContent("")}
            icon="🗑️"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
            icon="⚙️"
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action
            title="Send Feedback"
            onAction={() => {
              push(<SendFeedback />);
            }}
            icon="💬"
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Post Content"
        placeholder="Share your thoughts..."
        value={content}
        onChange={setContent}
      />

      <Form.Description title="Character Count" text={`${characterCount}/280 ${isOverLimit ? "❌" : "✅"}`} />
    </Form>
  );
}
