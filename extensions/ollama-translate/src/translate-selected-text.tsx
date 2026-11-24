import { Toast, getSelectedText, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { Translator } from "./components/translator";

export default function TranslateSelectedTextCommand() {
  const [selectedText, setSelectedText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void getSelectedText()
      .then((text) => {
        if (isMounted) setSelectedText(text);
      })
      .catch(async () => {
        await showToast({
          style: Toast.Style.Failure,
          title: "No text selected",
          message:
            "Select text in another app and run the command again, or type it here.",
        });
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Translator initialText={selectedText} initialTextLoading={isLoading} />
  );
}
