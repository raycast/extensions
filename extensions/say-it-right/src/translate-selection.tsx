import { Detail, getSelectedText } from "@raycast/api";
import { useEffect, useState } from "react";
import { TranslateView } from "./TranslateView";

export default function Command() {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const sel = (await getSelectedText())?.trim();
        if (sel) setText(sel);
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
        sourceTitle="Selection"
        preferredLanguage="en"
      />
    );
  }
  if (failed) {
    return (
      <Detail
        markdown={
          "# No Selected Text\n\nSelect text in another app and run this command again."
        }
      />
    );
  }
  return <Detail isLoading={true} markdown="# Opening Expression Coach..." />;
}
