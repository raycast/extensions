import { Form, LaunchProps, getSelectedText } from "@raycast/api";
import { useEffect, useState } from "react";
import { MainView, type LaunchInput } from "./ui/MainView";

type AskAiLaunchProps = LaunchProps<{ arguments: Arguments.AskAi; draftValues: Form.Values }>;

export default function Command(props: AskAiLaunchProps) {
  const prompt = props.arguments.prompt?.trim() ?? "";
  const [launchInput, setLaunchInput] = useState<LaunchInput>({
    prompt,
    selectedText: "",
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let selectedText = "";
      try {
        selectedText = (await getSelectedText()).trim();
      } catch {
        selectedText = "";
      }

      if (!cancelled) {
        setLaunchInput({ prompt, selectedText, ready: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prompt]);

  return <MainView launchInput={launchInput} draftValues={props.draftValues} />;
}
