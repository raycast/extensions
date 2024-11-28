import { showToast, Toast } from "@raycast/api";
import { FunctionComponent, useEffect } from "react";

interface Props {
  message?: string;
}

export const LoadingToast: FunctionComponent<Props> = ({ message }) => {
  useEffect(() => {
    (async () =>
      await showToast({
        style: Toast.Style.Animated,
        title: "Loading",
        message,
      }))();
  }, []);
  return null;
};
