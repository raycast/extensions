import { Detail, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";

export default function IAMMembersByPrincipalView() {
  useEffect(() => {
    showToast({
      style: Toast.Style.Failure,
      title: "Not implemented",
      message: "This view is under development",
    });
  }, []);

  return <Detail markdown="# IAM Members by Principal View\n\nThis view is currently under development." />;
}
