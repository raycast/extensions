import { showToast, Toast, showHUD, open, LocalStorage, confirmAlert, Alert, Clipboard } from "@raycast/api";

let isExecuting = false;

export default async function SetApiKey() {
  if (isExecuting) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Already Running",
      message: "API key setup is already in progress",
    });
    return;
  }

  isExecuting = true;

  try {
    let existingKey = "";
    try {
      const stored = await LocalStorage.getItem("pain-is-api-key");
      if (stored && typeof stored === "string") {
        existingKey = stored;
      }
    } catch {
      // Ignore errors
    }

    const hasExistingKey = existingKey.length > 0;
    const message = hasExistingKey
      ? `Current API key: ${existingKey.substring(0, 8)}...\n\nChoose an option:`
      : "No API key found. Choose an option:";

    const choice = await confirmAlert({
      title: "Pain.is API Key Setup",
      message,
      primaryAction: {
        title: hasExistingKey ? "Update API Key" : "Enter API Key",
        style: Alert.ActionStyle.Default,
      },
      dismissAction: {
        title: "Get API Key from Website",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!choice) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Opening Account Settings",
        message: "Copy your API key from the page that opens",
      });

      await open("https://beta.pain.is/dashboard/account-settings");

      await new Promise((resolve) => setTimeout(resolve, 1500));

      await showHUD("📋 Copy your API key, then run this command again to save it");
      return;
    }

    await showHUD("📋 Copy your API key to clipboard, then wait...");

    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const clipboardContent = await Clipboard.readText();

      if (!clipboardContent || clipboardContent.trim().length < 10) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid API Key",
          message: "No valid API key found in clipboard. Please copy your API key and try again.",
        });
        return;
      }

      const apiKey = clipboardContent.trim();

      if (apiKey.length < 10 || apiKey.includes(" ") || apiKey.includes("\n")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid API Key Format",
          message: "The clipboard content doesn't look like a valid API key.",
        });
        return;
      }

      await LocalStorage.setItem("pain-is-api-key", apiKey);

      await showToast({
        style: Toast.Style.Success,
        title: "API Key Saved!",
        message: `API key (${apiKey.substring(0, 8)}...) saved successfully`,
      });

      await showHUD("✅ API Key saved! You can now use the screenshot commands.");
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard Error",
        message: "Could not read from clipboard. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error in SetApiKey:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "An error occurred during API key setup",
    });
  } finally {
    setTimeout(() => {
      isExecuting = false;
    }, 2000);
  }
}
