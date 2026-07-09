import { Clipboard, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { TranslateView } from "./TranslateView";

export default function Command() {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const clipboardText = (await Clipboard.readText())?.trim();
        if (clipboardText) setText(clipboardText);
        else setFailed(true);
      } catch {
        setFailed(true);
      }
    })();
  }, []);

  if (text) {
    return (
      <TranslateView
        text={text}
        mode="express-intent"
        title="Expression Coach"
        sourceTitle="Clipboard"
        preferredLanguage="en"
      />
    );
  }
  if (failed) {
    return (
      <Detail
        markdown={
          "# No Clipboard Text\n\nCopy text to the clipboard and run this command again."
        }
      />
    );
  }
  return <Detail isLoading={true} markdown="# Reading Clipboard..." />;
}
