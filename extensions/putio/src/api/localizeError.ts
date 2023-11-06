import {
  APIErrorByStatusCodeLocalizer,
  GenericErrorLocalizer,
  createLocalizeError,
  LocalizedError,
} from "@putdotio/utilities";
import { Toast } from "@raycast/api";

const authErrorLocalizer: APIErrorByStatusCodeLocalizer = {
  kind: "api_status_code",
  status_code: 401,
  localize: () => ({
    message: "You are not authorized",
    recoverySuggestion: {
      type: "instruction",
      description: "Please login again.",
    },
  }),
};

const notFoundErrorLocalizer: APIErrorByStatusCodeLocalizer = {
  kind: "api_status_code",
  status_code: 404,
  localize: () => ({
    message: "Resource not found",
    recoverySuggestion: {
      type: "instruction",
      description: "The resource you are looking for does not exist.",
    },
  }),
};

const genericErrorLocalizer: GenericErrorLocalizer = {
  kind: "generic",
  localize: () => ({
    message: "Something went wrong",
    recoverySuggestion: {
      type: "instruction",
      description: "Please try again.",
    },
  }),
};

export const localizeError = createLocalizeError([authErrorLocalizer, notFoundErrorLocalizer, genericErrorLocalizer]);

type LocalizedErrorToToastOptions = {
  title: Toast.Options["title"];
  message: NonNullable<Toast.Options["message"]>;
  style: NonNullable<Toast.Options["style"]>;
  primaryAction?: Toast.Options["primaryAction"];
};

export const localizedErrorToToastOptions = (error: LocalizedError): LocalizedErrorToToastOptions => {
  const { message, recoverySuggestion } = error;

  const toastOptions: LocalizedErrorToToastOptions = {
    title: message,
    message: recoverySuggestion.description,
    style: Toast.Style.Failure,
  };

  if (recoverySuggestion.type === "action") {
    toastOptions.primaryAction = {
      title: recoverySuggestion.trigger.label,
      onAction: () => recoverySuggestion.trigger.callback(),
    };
  }

  return toastOptions;
};
