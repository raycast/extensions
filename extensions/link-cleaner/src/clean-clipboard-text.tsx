import { Clipboard, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import CleanFlow from "./components/CleanFlow";
import { Form } from "@raycast/api";

export default function Command() {
  const [rawText, setRawText] = useState<string>();

  useEffect(() => {
    Clipboard.readText()
      .then((text) => {
        if (!text) {
          showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
          popToRoot();
          return;
        }
        setRawText(text);
      })
      .catch(() => {
        showToast({ style: Toast.Style.Failure, title: "Failed to read clipboard" });
        popToRoot();
      });
  }, []);

  if (!rawText) return <Form isLoading />;
  return <CleanFlow rawText={rawText} />;
}
