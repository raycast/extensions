import { showFailureToast } from "@raycast/utils";
import { Alert } from "../types/alert";
import apiClient from "../utils/constants";

export class AlertsService {
  public static async fetchAlerts(): Promise<Alert[]> {
    try {
      const response = await apiClient.get("/alerts");
      return response.data?.data;
    } catch (error) {
      console.error("Error fetching alerts:", error);
      await showFailureToast(error, { title: "Error fetching alerts." });
      throw error;
    }
  }

  public static async markAllAsRead(): Promise<boolean> {
    try {
      const response = await apiClient.patch("/alerts", { read: true });
      return response.status == 200;
    } catch (error) {
      console.error("Error marking alerts as read:", error);
      await showFailureToast(error, { title: "Error marking alerts as read." });
      throw error;
    }
  }
}
