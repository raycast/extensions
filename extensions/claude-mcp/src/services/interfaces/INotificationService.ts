/**
 * Notification service interface for UI notifications
 * Abstracts toast and alert operations for dependency inversion
 */

export enum NotificationStyle {
  Success = "success",
  Failure = "failure",
  Animated = "animated",
}

export interface NotificationOptions {
  style: NotificationStyle;
  title: string;
  message?: string;
}

export interface ConfirmationOptions {
  title: string;
  message: string;
  primaryAction: {
    title: string;
  };
  dismissAction: {
    title: string;
  };
}

export interface INotificationService {
  /**
   * Show a toast notification
   */
  showToast(options: NotificationOptions): Promise<void>;

  /**
   * Show success notification
   */
  showSuccess(title: string, message?: string): Promise<void>;

  /**
   * Show error notification
   */
  showError(title: string, message?: string): Promise<void>;

  /**
   * Show loading notification
   */
  showLoading(title: string, message?: string): Promise<void>;

  /**
   * Show confirmation dialog
   */
  showConfirmation(options: ConfirmationOptions): Promise<boolean>;

  /**
   * Update existing toast notification
   */
  updateToast(id: string, options: Partial<NotificationOptions>): Promise<void>;
}
