import {
  showToast,
  Toast,
  getPreferenceValues,
  LaunchProps,
  closeMainWindow,
} from "@raycast/api";
import {
  isLoggedIn,
  login,
  getCurrentUser,
} from "./utils/auth";
import { saveTabToQstash, isValidUrl } from "./utils/qstash";

interface Arguments {
  content: string;
}

export default async function SaveToWebBites(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { content } = props.arguments;

  try {
    // Close the main window immediately
    await closeMainWindow();

    // Check if user is authenticated
    const authenticated = await isLoggedIn();

    if (!authenticated) {
      // Try to log in with preferences
      const preferences = getPreferenceValues<{
        email: string;
        password: string;
      }>();

      if (preferences.email && preferences.password) {
        await login(preferences.email, preferences.password);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Required",
          message:
            "Please configure your WebBites credentials in extension preferences",
        });
        return;
      }
    }

    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      await showToast({
        style: Toast.Style.Failure,
        title: "User Not Found",
        message: "Unable to get current user information",
      });
      return;
    }

    // Determine if content is a URL or text note
    const isUrl = isValidUrl(content);

    let data;
    
    if (isUrl) {
      // Handle URL saving
      const url =
        content.startsWith("http://") || content.startsWith("https://")
          ? content
          : `https://${content}`;
      const title = content;

      // Prepare data for backend API - URL
      data = {
        url,
        title,
        userId: currentUser.id,
        topic: "website-save-requests",
        siteNotes: "",
        tags: [],
        customId: null,
      };
    } else {
      // Handle text note saving
      data = {
        textNote: content,
        title: content.substring(0, 50) + (content.length > 50 ? "..." : ""), // Use first 50 chars as title
        userId: currentUser.id,
        topic: "text-note-save-requests",
        siteNotes: "",
        tags: [],
        customId: null,
      };
    }

    // Show immediate feedback to user
    await showToast({
      style: Toast.Style.Animated,
      title: isUrl ? "Saving bookmark..." : "Saving note...",
      message: "Please wait while we process your request",
    });

    // Send to backend API
    await saveTabToQstash(data);

    await showToast({
      style: Toast.Style.Success,
      title: isUrl ? "Bookmark saved to WebBites" : "Note saved to WebBites",
      message: isUrl ? `URL "${content}" has been saved successfully` : `Text note has been saved successfully`,
    });
  } catch (error) {
    console.error("Error saving to WebBites:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Save Failed",
      message: "Failed to save to WebBites. Please try again.",
    });
  }
}
