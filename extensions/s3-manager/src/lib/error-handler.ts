import { UserFriendlyError } from "../types";

interface StatusCodeError extends Error {
  statusCode?: number;
}

export class S3ErrorHandler {
  static handle(error: Error): UserFriendlyError {
    if (error.name === "S3Error") {
      return this.handleS3ServiceError(error);
    }

    if (error.message.includes("ERR_S3_")) {
      return this.handleBunS3Error(error);
    }

    if (error.message.includes("Profile") && error.message.includes("not found")) {
      return this.handleProfileError(error);
    }

    if (error.message.includes("credentials") || error.message.includes("access")) {
      return this.handleAuthError(error);
    }

    return this.handleGenericError(error);
  }

  private static handleS3ServiceError(error: Error): UserFriendlyError {
    const statusCode = (error as StatusCodeError).statusCode;

    switch (statusCode) {
      case 403:
        return {
          title: "Access Denied",
          message: "Check your credentials and bucket permissions",
          actions: [
            { title: "Retry", action: "retry" },
            { title: "Edit Profile", action: "edit-profile" },
          ],
        };
      case 404:
        return {
          title: "Not Found",
          message: "The requested bucket or object doesn't exist",
          actions: [
            { title: "Browse Buckets", action: "browse" },
            { title: "Refresh", action: "refresh" },
          ],
        };
      case 429:
        return {
          title: "Rate Limited",
          message: "Too many requests. Please wait and try again",
          actions: [{ title: "Retry", action: "retry" }],
        };
      case 500:
      case 502:
      case 503:
        return {
          title: "Service Unavailable",
          message: "S3 service is temporarily unavailable",
          actions: [{ title: "Retry", action: "retry" }],
        };
      default:
        return {
          title: "S3 Service Error",
          message: error.message || "An unknown S3 error occurred",
          actions: [{ title: "Retry", action: "retry" }],
        };
    }
  }

  private static handleBunS3Error(error: Error): UserFriendlyError {
    if (error.message.includes("ERR_S3_INVALID_CREDENTIALS")) {
      return {
        title: "Invalid Credentials",
        message: "Your AWS credentials are invalid or expired",
        actions: [
          { title: "Update Credentials", action: "edit-profile" },
          { title: "Test Connection", action: "test-connection" },
        ],
      };
    }

    if (error.message.includes("ERR_S3_NETWORK")) {
      return {
        title: "Network Error",
        message: "Unable to connect to S3 service",
        actions: [
          { title: "Retry", action: "retry" },
          { title: "Check Connection", action: "check-network" },
        ],
      };
    }

    return {
      title: "S3 Client Error",
      message: error.message || "An S3 client error occurred",
      actions: [{ title: "Retry", action: "retry" }],
    };
  }

  private static handleProfileError(): UserFriendlyError {
    return {
      title: "Profile Not Found",
      message: "The selected S3 profile doesn't exist or is corrupted",
      actions: [
        { title: "Create Profile", action: "create-profile" },
        { title: "Select Profile", action: "select-profile" },
      ],
    };
  }

  private static handleAuthError(): UserFriendlyError {
    return {
      title: "Authentication Failed",
      message: "Unable to authenticate with S3 service",
      actions: [
        { title: "Update Credentials", action: "edit-profile" },
        { title: "Test Connection", action: "test-connection" },
      ],
    };
  }

  private static handleGenericError(error: Error): UserFriendlyError {
    return {
      title: "Unexpected Error",
      message: error.message || "An unexpected error occurred",
      actions: [
        { title: "Retry", action: "retry" },
        { title: "Report Issue", action: "report" },
      ],
    };
  }

  static isRetryableError(error: Error): boolean {
    const retryableErrors = ["NETWORK_ERROR", "TIMEOUT", "RATE_LIMITED", "SERVICE_UNAVAILABLE", "ERR_S3_NETWORK"];

    return retryableErrors.some((errorType) => error.message.includes(errorType) || error.name.includes(errorType));
  }

  static getRetryDelay(attemptNumber: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attemptNumber), 30000);
  }
}
