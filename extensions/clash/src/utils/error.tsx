import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from ".";

const NoBackendError = new Error("No avaliable backend");
const BackendNotExistError = new Error("Current backend deleted");

const ErrorHandler = function (e: unknown) {
  switch (e) {
    case NoBackendError: {
      showToast(Toast.Style.Failure, NoBackendError.message, "Configure in 'Backends'");
      break;
    }
    case BackendNotExistError: {
      showToast(Toast.Style.Failure, NoBackendError.message, "Configure in 'Backends'");
      break;
    }
    default: {
      console.error(e);
      showFailureToast("Request failed", e);
    }
  }
};

export { NoBackendError, BackendNotExistError, ErrorHandler };
