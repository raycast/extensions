import AddyError from "./api/error";

export function formatAPIError(error: unknown, defaultTitle = "Operation Failed") {
  if (error instanceof AddyError) {
    switch (error.status) {
      case 401:
        return {
          title: "Invalid API Key",
          message: "Please check your credentials in the extension preferences.",
        };
      case 422:
        return {
          title: "Validation Error",
          message: "The request validation failed. Please check your input.",
        };
      case 429:
        return {
          title: defaultTitle,
          message: "You may have reached your account limit or rate limit. Please try again later.",
        };
      default:
        return {
          title: defaultTitle,
          message: `API Error: ${error.status}. Please try again.`,
        };
    }
  }

  return {
    title: defaultTitle,
    message: error instanceof Error ? error.message : "An unexpected error occurred.",
  };
}
