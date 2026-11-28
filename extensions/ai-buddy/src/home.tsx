import { LaunchProps, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { BuddyHome } from "./buddy-home";
import { loadConnection } from "./connection";
import { InputForm } from "./input-form";
import { isSetUp } from "./llm";
import { LLMRequest, LLMView } from "./llm-view";
import { AISetup } from "./setup-view";

// Opened by Buddy Translate / Draft Reply / Polish English with a launch context:
// with text it shows the result, without text an input form. Opened directly, it is the home screen.
// Before the first AI Setup, every way in starts there, then carries on.
export default function Command({ launchContext }: LaunchProps<{ launchContext?: LLMRequest }>) {
  const [state, setState] = useState<"loading" | "setup" | "ready">("loading");
  useEffect(() => {
    loadConnection()
      .then(() => setState(isSetUp() ? "ready" : "setup"))
      .catch(() => setState("setup"));
  }, []);

  if (state === "loading") return <List isLoading />;
  if (state === "setup") return <AISetup isRoot onSaved={() => setState("ready")} />;
  if (!launchContext?.mode) return <BuddyHome />;
  return launchContext.text ? (
    <LLMView {...launchContext} />
  ) : (
    <InputForm mode={launchContext.mode} replyLanguage={launchContext.replyLanguage} />
  );
}
