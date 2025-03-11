import { open, showToast, Toast } from "@raycast/api";

type Input = {
  /**
   * The title of the tip
   */
  title: string;
  /**
   * The detailed description of the tip
   */
  description: string;
  /**
   * The name of the person submitting the tip (optional)
   */
  name?: string;
};

/**
 * Submit a tip to Caschys Blog
 * @param input The tip details
 * @returns A confirmation message
 */
export default async function submitTip(input: Input) {
  const { title, description, name } = input;

  if (!title.trim()) {
    throw new Error("Please provide a title for your tip");
  }

  if (!description.trim()) {
    throw new Error("Please provide a description for your tip");
  }

  try {
    // Create email content
    const subject = `Tip for Caschys Blog: ${title}`;
    const body = `Title: ${title}\n\nDescription: ${description}\n\nSubmitted by: ${name || "Anonymous"}`;

    // Open default email client
    await open(
      `mailto:tipp@stadt-bremerhaven.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );

    await showToast({
      style: Toast.Style.Success,
      title: "Email client opened",
      message: "Your tip is ready to be sent",
    });

    return {
      success: true,
      message: "Email client opened with your tip. Please review and send the email.",
    };
  } catch (error) {
    console.error("Error opening email client:", error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Error opening email client",
      message: error instanceof Error ? error.message : "Unknown error",
    });

    throw new Error("Failed to open email client");
  }
}

/**
 * Confirmation message for submitting a tip
 */
export const confirmation = (input: Input) => {
  return {
    title: "Submit Tip",
    message: `Are you sure you want to submit a tip titled "${input.title}"?`,
    icon: "✉️",
  };
};
