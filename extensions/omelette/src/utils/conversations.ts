import { LocalStorage, showToast, Toast } from "@raycast/api";
import { Conversation } from "../types/conversation";

/**
 * Adds a conversation directly to localStorage without hooks.
 * Use this in components that don't need the full useConversations hook
 * to avoid unnecessary useQuestions instances and render churn.
 */
export async function addConversation(conversation: Conversation) {
  const toast = await showToast({
    title: "Creating conversation...",
    style: Toast.Style.Animated,
  });

  try {
    const stored = await LocalStorage.getItem<string>("conversations");
    const items: Conversation[] = stored ? JSON.parse(stored) : [];
    items.push(conversation);
    await LocalStorage.setItem("conversations", JSON.stringify(items));

    toast.title = "Conversation created!";
    toast.style = Toast.Style.Success;
  } catch (error) {
    toast.title = "Failed to create conversation";
    toast.style = Toast.Style.Failure;
    throw error;
  }
}
