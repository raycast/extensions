import { Detail } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect } from "react";

export default function IAMMembersByPrincipalView() {
  useEffect(() => {
    showFailureToast({
      title: "Not implemented",
      message: "This view is under development",
    });
  }, []);

  return <Detail markdown="# IAM Members by Principal View\n\nThis view is currently under development." />;
}
