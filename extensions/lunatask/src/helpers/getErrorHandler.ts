export default function getErrorHandler(statusCode: number) {
  switch (statusCode) {
    case 401:
      return {
        title: "Issue with Access Token",
        message: "Please configure it again in the extension preferences.",
      };
    case 404:
      return {
        title: "Default Area ID not found",
        message: "Please set a Default Area ID in the extension preferences.",
      };
    case 422:
      return { title: "Issue with data being sent", message: "Please contact the extension developer." };
    case 500:
      return {
        title: "Internal Server Error",
        message:
          "We encountered a problem processing your request and have been notified. Please, try again later. If the problem persists, please, contact us.",
      };
    case 503:
      return {
        title: "Service Unavailable",
        message: "We're temporarily offline for maintenance - please try again later.",
      };
    case 524:
      return { title: "Request Timed Out", message: "Please try again." };
    default:
      return {
        title: "Unknown Error",
        message: "Please try again. If the issue persists, please contact the extension developer.",
      };
  }
}
