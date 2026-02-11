import { showFailureToast } from "@raycast/utils";
import fetch from "node-fetch";

const STARTURL = "http://localhost:48065/wechat/start";

/**
 * Service for handling WeChat-related operations
 */
class WeChatService {
  /**
   * Start a chat with a contact
   * @param contactId - WeChat ID of the contact
   */
  async startChat(contactId: string): Promise<void> {
    const url = this.getStartUrl(contactId);
    try {
      await fetch(url);
    } catch (error) {
      showFailureToast(error, { title: "Failed to start WeChat chat" });
      throw error;
    }
  }

  /**
   * Get the URL to start a chat
   * @param contactId - WeChat ID of the contact
   * @returns URL to start chat
   */
  getStartUrl(contactId: string): string {
    return `${STARTURL}?session=${encodeURIComponent(contactId)}`;
  }
}

export const wechatService = new WeChatService();
