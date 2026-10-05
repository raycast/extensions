import { showFailureToast, usePromise } from "@raycast/utils";
import { ApiError } from "../api/apiError";
import { getCurrentUser } from "../api/auth";
import { toErrorMessage } from "../helpers/errors";
import { getConfiguredInstanceUrl, getMemosConnection } from "../helpers/preferences";

const checkConnection = () => getCurrentUser(getMemosConnection());

export const useConnectionCheck = () => {
  const {
    data: user,
    error,
    isLoading,
    revalidate,
  } = usePromise(checkConnection, [], {
    onError: (err) => {
      void showFailureToast(err, { title: "Couldn't connect to Memos" });
    },
  });
  return {
    instanceUrl: getConfiguredInstanceUrl(),
    user,
    errorMessage: error == null ? undefined : toErrorMessage(error),
    isTokenRejected: error instanceof ApiError && (error.status === 401 || error.status === 403),
    isLoading,
    revalidate,
  };
};
