import { FunctionComponent, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

interface Props {
  error: Error;
}

export const ErrorToast: FunctionComponent<Props> = ({ error }) => {
  useEffect(() => {
    (async () =>
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error.message,
      }))();
  }, []);
  return null;
};
