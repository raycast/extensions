import { Icon } from "@raycast/api";
import { useState } from "react";
import { TextInputForm } from "./components/TextInputForm";
import { TranslateView } from "./TranslateView";

export default function Command() {
  const [intent, setIntent] = useState<string | null>(null);

  if (intent) {
    return (
      <TranslateView
        text={intent}
        mode="express-intent"
        title="Expression Coach"
        sourceTitle="What You Mean"
        preferredLanguage="en"
      />
    );
  }

  return (
    <TextInputForm
      onSubmit={(text) => setIntent(text.trim())}
      submitTitle="Say It in English"
      submitIcon={Icon.Message}
      title="Say What I Mean"
      placeholder="Type what you mean in Chinese..."
    />
  );
}
