import { Toast } from "@raycast/api";

export function displayErrorToast(toast: Toast, error: unknown) {
  toast.style = Toast.Style.Failure;
  const err = error instanceof Error ? error : new Error("Unknown error");
  const lowercaseMsg = err.message.toLowerCase();

  // Default fallback
  toast.title = "Failed";
  toast.message = err.message;

  // Identify Raycast AI specific errors
  if (err.name === "Error" && err.message.includes("Raycast")) {
    if (
      err.message.toLowerCase().includes("pro") ||
      err.message.toLowerCase().includes("subscription")
    ) {
      toast.title = "Raycast Pro Required";
      toast.message =
        "This feature requires a Raycast Pro subscription. Alternatively, select a Custom API Provider in the extension settings.";
    } else {
      const msg = err.message.replace(/^Raycast:\s*/i, "");
      if (msg.length < 40) {
        toast.title = msg;
        toast.message = "";
      } else {
        toast.title = "Raycast AI Error";
        toast.message = msg;
      }
    }
    return;
  }

  // Identify configuration missing errors
  if (err.message.includes("API Key is required")) {
    toast.title = "API Key Missing";
    toast.message =
      "Open Raycast Settings (⌘+,) -> Extensions -> InFlow to configure your API key.";
    return;
  }

  if (lowercaseMsg.includes("base url is required")) {
    toast.title = "Base URL Missing";
    toast.message =
      "Open Raycast Settings (⌘+,) -> Extensions -> InFlow to configure your provider Base URL.";
    return;
  }

  if (lowercaseMsg.includes("empty response")) {
    toast.title = "Empty Model Response";
    toast.message =
      "The provider returned no usable text. Try another model or check the model settings.";
    return;
  }

  // Identify network or API specific response errors
  if (
    err.message.includes("API Error") ||
    err.message.includes("Unsupported provider")
  ) {
    toast.title = "Provider Connection Failed";

    if (
      lowercaseMsg.includes("401") ||
      lowercaseMsg.includes("unauthorized") ||
      lowercaseMsg.includes("invalid_api_key")
    ) {
      toast.message = "Invalid API Key. Please verify it in Settings.";
    } else if (
      lowercaseMsg.includes("404") ||
      lowercaseMsg.includes("model_not_found")
    ) {
      toast.message =
        "Model not found. Please verify your Model ID in Settings.";
    } else if (
      lowercaseMsg.includes("429") ||
      lowercaseMsg.includes("quota") ||
      lowercaseMsg.includes("insufficient")
    ) {
      toast.message =
        "Rate limit or quota exceeded. Please check your provider account balance.";
    } else if (
      lowercaseMsg.includes("fetch") ||
      lowercaseMsg.includes("network")
    ) {
      toast.message =
        "Network error. Please check your connection or Base URL.";
    } else {
      const errCodePoints = [...err.message];
      toast.message =
        errCodePoints.length > 80
          ? errCodePoints.slice(0, 80).join("") + "..."
          : err.message;
    }
    return;
  }
}
