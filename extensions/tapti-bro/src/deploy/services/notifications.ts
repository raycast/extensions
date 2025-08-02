import axios from "axios";
import { GOOGLE_CHAT_WEBHOOK_URL } from "../constants";

export class NotificationService {
  constructor(private userName: string) {}

  async sendGoogleChatNotification(serviceName: string, action: string): Promise<void> {
    try {
      const message = {
        text: `🚀 *${this.userName}* triggered ${action} for *${serviceName}*`,
        cards: [
          {
            sections: [
              {
                widgets: [
                  {
                    keyValue: {
                      topLabel: "User",
                      content: this.userName,
                      icon: "PERSON",
                    },
                  },
                  {
                    keyValue: {
                      topLabel: "Service",
                      content: serviceName,
                      icon: "STAR",
                    },
                  },
                  {
                    keyValue: {
                      topLabel: "Action",
                      content: action,
                      icon: "DESCRIPTION",
                    },
                  },
                  {
                    keyValue: {
                      topLabel: "Time",
                      content: new Date().toLocaleString(),
                      icon: "CLOCK",
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      await axios.post(GOOGLE_CHAT_WEBHOOK_URL, message, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(`Google Chat notification sent for ${serviceName} ${action}`);
    } catch (error) {
      console.error("Failed to send Google Chat notification:", error);
      // Don't throw error to avoid interrupting workflow
    }
  }
}
