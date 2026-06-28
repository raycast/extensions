import { TEnvironment } from "../types";

export const parseEnvironment = (env: TEnvironment) => {
  switch (env) {
    case "development":
      return "Dev";
    case "production":
      return "Prod";
    case "test":
      return "Test";
    case "preproduction":
      return "Preprod";
    default:
      return "Unknown";
  }
};

export const generateErrorMessage = (errCode: number) => {
  switch (errCode) {
    case 401:
      return "Unauthorized. Please update your token or API in the preferences";
    case 403:
      return "Forbidden. You don't have permission to access this resource";
    case 404:
      return "Resource not found";
    default:
      return "An error occurred";
  }
};
