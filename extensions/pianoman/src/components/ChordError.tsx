import { useState, useEffect } from "react";
import { Detail, showToast, Toast } from "@raycast/api";

type ChordErrorProps = {
  msg?: string;
};

export function ChordError({ msg }: ChordErrorProps) {
  const [error, setError] = useState<string | undefined>(msg);

  showToast({
    style: Toast.Style.Failure,
    title: "Something went wrong",
    message: "eer",
  });

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: msg,
      });
    }
  }, [error]);

  return <Detail markdown="Failed to find piano chord based on ..." />;
}
