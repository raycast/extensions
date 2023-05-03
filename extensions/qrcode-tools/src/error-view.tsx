import { Detail, Toast, popToRoot, showToast } from "@raycast/api";
import { FC, useEffect } from "react";

export const ErrorView: FC<{ error: Error }> = (props) => {
  useEffect(() => {
    showToast({
      style: Toast.Style.Failure,
      title: props.error.message,
    });
    popToRoot();
  }, []);

  return <Detail />;
};
