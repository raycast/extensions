/**
 * Notification service implementation wrapping Raycast's notification functions
 * Provides abstraction layer following Dependency Inversion Principle
 */

import { Toast, showToast, confirmAlert } from "@raycast/api";
import {
  INotificationService,
  NotificationOptions,
  NotificationStyle,
  ConfirmationOptions,
} from "../interfaces/INotificationService";

export class NotificationService implements INotificationService {
  private toastMap = new Map<string, Toast>();

  async showToast(options: NotificationOptions): Promise<void> {
    try {
      const raycastStyle = this.mapNotificationStyleToRaycast(options.style);

      const toast = await showToast({
        style: raycastStyle,
        title: options.title,
        message: options.message,
      });

      // Store toast reference for potential updates
      const toastId = this.generateToastId();
      this.toastMap.set(toastId, toast);

      // Clean up after 10 seconds
      setTimeout(() => {
        this.toastMap.delete(toastId);
      }, 10000);
    } catch (error) {
      console.error("Error showing toast:", error);
      // Fallback to console logging if toast fails
      console.log(`${options.style.toUpperCase()}: ${options.title}`, options.message || "");
    }
  }

  async showSuccess(title: string, message?: string): Promise<void> {
    await this.showToast({
      style: NotificationStyle.Success,
      title,
      message,
    });
  }

  async showError(title: string, message?: string): Promise<void> {
    await this.showToast({
      style: NotificationStyle.Failure,
      title,
      message,
    });
  }

  async showLoading(title: string, message?: string): Promise<void> {
    await this.showToast({
      style: NotificationStyle.Animated,
      title,
      message,
    });
  }

  async showConfirmation(options: ConfirmationOptions): Promise<boolean> {
    try {
      const result = await confirmAlert({
        title: options.title,
        message: options.message,
        primaryAction: {
          title: options.primaryAction.title,
        },
        dismissAction: {
          title: options.dismissAction.title,
        },
      });

      return result;
    } catch (error) {
      console.error("Error showing confirmation:", error);
      // Default to false (dismissed) if confirmation fails
      return false;
    }
  }

  async updateToast(id: string, options: Partial<NotificationOptions>): Promise<void> {
    try {
      const toast = this.toastMap.get(id);
      if (!toast) {
        console.warn(`Toast with ID ${id} not found for update`);
        return;
      }

      if (options.style !== undefined) {
        toast.style = this.mapNotificationStyleToRaycast(options.style);
      }

      if (options.title !== undefined) {
        toast.title = options.title;
      }

      if (options.message !== undefined) {
        toast.message = options.message;
      }
    } catch (error) {
      console.error("Error updating toast:", error);
    }
  }

  private mapNotificationStyleToRaycast(style: NotificationStyle): Toast.Style {
    switch (style) {
      case NotificationStyle.Success:
        return Toast.Style.Success;
      case NotificationStyle.Failure:
        return Toast.Style.Failure;
      case NotificationStyle.Animated:
        return Toast.Style.Animated;
      default:
        return Toast.Style.Success;
    }
  }

  private generateToastId(): string {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
