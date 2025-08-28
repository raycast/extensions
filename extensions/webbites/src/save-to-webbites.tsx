import {
  showToast,
  Toast,
  getPreferenceValues,
  LaunchProps,
  closeMainWindow,
} from "@raycast/api";
import {
  initializeParse,
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

    // Initialize Parse
    initializeParse();

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

    // Only allow saving websites
    if (!isUrl) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Content",
        message: "Only websites can be saved. Please enter a valid URL.",
      });
      return;
    }

    // Add protocol if missing
    const url =
      content.startsWith("http://") || content.startsWith("https://")
        ? content
        : `https://${content}`;
    const title = content;

    // Prepare data for QStash
    const data = {
      url,
      title,
      userId: currentUser.id,
      topic: "website-save-requests",
      siteNotes: "",
      tags: [],
      customId: null,
    };

    // Send to QStash
    await saveTabToQstash(data);

    await showToast({
      style: Toast.Style.Success,
      title: "Saved to WebBites",
      message: `"${content}" has been saved successfully`,
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
