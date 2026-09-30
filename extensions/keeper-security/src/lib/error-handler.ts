/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosError } from "axios";
import { API_ERROR_MESSAGES } from "./constants";

export interface IHandleError {
  title: string;
  message: string;
  errorType: "SERVER_CLOSED" | "API_ERROR" | "UNKNOWN";
}

export const handleError = (error: unknown): IHandleError => {
  // Handle Axios errors
  if (error instanceof AxiosError) {
    // Check if server is closed/connection refused
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND" || !error.response) {
      return {
        title: "Server Not Running",
        message: "Cannot connect to Keeper Commander service mode. Please make sure the service is running.",
        errorType: "SERVER_CLOSED",
      };
    }

    // Handle other API errors
    const status = error.response?.status;
    const data = error.response?.data as any;

    // Map HTTP status codes to user-friendly messages
    const statusMessage = getStatusMessage(status, data);

    return {
      title: getStatusTitle(status),
      message: statusMessage,
      errorType: "API_ERROR",
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      title: "Error",
      message: error.message,
      errorType: "UNKNOWN",
    };
  }

  // Handle unknown errors
  return {
    title: "Unknown Error",
    message: API_ERROR_MESSAGES.UNKNOWN_ERROR,
    errorType: "UNKNOWN",
  };
};

// Helper function to get appropriate title based on HTTP status
const getStatusTitle = (status: number | undefined): string => {
  if (!status) return "Connection Error";

  switch (status) {
    case 400:
      return "Bad Request";
    case 401:
      return "Unauthorized";
    case 403:
      return "Access Denied";
    case 404:
      return "Not Found";
    case 429:
      return "Rate Limit Exceeded";
    case 500:
      return "Internal Server Error";
    case 503:
      return "Service Unavailable";
    default:
      if (status >= 400 && status < 500) {
        return "Client Error";
      } else if (status >= 500) {
        return "Server Error";
      }
      return "API Error";
  }
};

// Helper function to get user-friendly message based on HTTP status
const getStatusMessage = (status: number | undefined, data: any): string => {
  if (!status) return API_ERROR_MESSAGES.NETWORK_ERROR;

  switch (status) {
    // Client Errors (4xx)
    case 400:
      return data?.message || data?.error || API_ERROR_MESSAGES.BAD_REQUEST;
    case 401:
      return data?.message || data?.error || API_ERROR_MESSAGES.UNAUTHORIZED;
    case 403:
      return data?.message || data?.error || API_ERROR_MESSAGES.FORBIDDEN;
    case 404:
      return data?.message || data?.error || API_ERROR_MESSAGES.NOT_FOUND;
    case 429:
      return data?.message || data?.error || API_ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;

    // Server Errors (5xx)
    case 500:
      return data?.message || data?.error || API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    case 503:
      return data?.message || data?.error || API_ERROR_MESSAGES.SERVICE_UNAVAILABLE;

    // Other status codes
    default:
      if (status >= 400 && status < 500) {
        return data?.message || data?.error || `Client error (${status}). Please check your request.`;
      } else if (status >= 500) {
        return data?.message || data?.error || `Server error (${status}). Please try again later.`;
      }
      return data?.message || data?.error || API_ERROR_MESSAGES.UNEXPECTED_ERROR;
  }
};
