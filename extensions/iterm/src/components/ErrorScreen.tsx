import React from "react";

import { ASPermissionEvalError, FinderError, PyPermissionError } from "../utils";
import { useErrorToast } from "../hooks";
import { UNKNOWN_ERROR } from "../core";

import { FinderErrorScreen, GeneralErrorScreen, PermissionErrorScreen } from "./KnownErrorScreens";

type ErrorScreenProps = {
  errorToast?: string | null;
  error: Error | null;
};

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ error, errorToast }) => {
  useErrorToast(errorToast || null);

  switch (error?.constructor) {
    case ASPermissionEvalError:
      return <PermissionErrorScreen />;

    case PyPermissionError:
      return <PermissionErrorScreen pythonPermissions={true} />;

    case FinderError:
      return <FinderErrorScreen reason={error} />;

    default: {
      return <GeneralErrorScreen reason={error || UNKNOWN_ERROR} />;
    }
  }
};
