import { getSelectedText, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import CleanFlow from "./components/CleanFlow";
import { Form } from "@raycast/api";

export default function Command() {
  const [rawText, setRawText] = useState<string>();

  useEffect(() => {
    getSelectedText()
      .then((text) => {
        if (!text) {
          showToast({ style: Toast.Style.Failure, title: "No text selected" });
          popToRoot();
          return;
        }
        setRawText(text);
      })
      .catch(() => {
        showToast({ style: Toast.Style.Failure, title: "Failed to get selected text" });
        popToRoot();
      });
  }, []);

  if (!rawText) return <Form isLoading />;
  return <CleanFlow rawText={rawText} />;
}
