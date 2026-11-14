import { open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { buildTipMailto } from "../mailto";

/**
 * Input parameters for the submit-tip tool
 */
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
 *
 * This tool allows the AI assistant to help users submit tips to the blog.
 * It validates the input, creates an email with the tip details, and opens the default email client.
 * The user can then review and send the email directly from their email client.
 *
 * @param input The tip details including title, description, and optional name
 * @returns A confirmation message with success status and instructions
 */
export default async function submitTip(input: Input) {
  const { title, description, name } = input;

  /**
   * Validate required fields
   * Both title and description must be provided and non-empty
   */
  if (!title.trim()) {
    throw new Error("Please provide a title for your tip");
  }

  if (!description.trim()) {
    throw new Error("Please provide a description for your tip");
  }

  try {
    await open(buildTipMailto({ title, description, name }));

    /**
     * Show success toast notification
     * Informs the user that the email client has been opened
     */
    await showToast({
      style: Toast.Style.Success,
      title: "Email draft opened",
      message: "Review it in your mail app before sending",
    });

    /**
     * Return success response
     * Includes confirmation message for the user
     */
    return {
      success: true,
      message: "The draft is open in your mail app. Review it before sending.",
    };
  } catch (error) {
    /**
     * Handle errors when opening email client
     * Logs error to console and shows failure toast
     */
    console.error("Error opening email client:", error);
    await showFailureToast(error, {
      title: "Error opening email client",
    });

    throw new Error("Failed to open email client");
  }
}

/**
 * Confirmation message for submitting a tip
 *
 * This function provides a confirmation prompt that will be shown to the user
 * before the tip is submitted, allowing them to confirm or cancel the action.
 *
 * @param input The tip details to include in the confirmation message
 * @returns A confirmation object with title, message, and icon
 */
export const confirmation = (input: Input) => {
  return {
    title: "Open Tip Draft",
    message: `Open an email draft for the tip "${input.title}"? Nothing is sent automatically.`,
    icon: "✉️",
  };
};
