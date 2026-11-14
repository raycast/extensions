import { Detail, type LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { AnswerView } from "./components/AnswerView";
import { PreflightGate } from "./components/PreflightGate";
import { QuickAiForm } from "./components/QuickAiForm";
import { readSelection } from "./services/input";
import { getSettings } from "./services/settings";

export default function Command(props: LaunchProps<{ arguments: Arguments.AskLocalAi }>) {
  return (
    <PreflightGate>
      <AskLocalAi query={props.arguments.query} />
    </PreflightGate>
  );
}

function AskLocalAi(props: { query?: string }) {
  const [selection, setSelection] = useState<string | undefined>();
  const [selectionLoaded, setSelectionLoaded] = useState(false);
  const [question, setQuestion] = useState(props.query?.trim() || undefined);

  useEffect(() => {
    if (!getSettings().quickAiIncludeSelection) {
      setSelectionLoaded(true);
      return;
    }
    readSelection().then((text) => {
      setSelection(text?.trim() ? text : undefined);
      setSelectionLoaded(true);
    });
  }, []);

  if (!selectionLoaded) return <Detail isLoading />;
  if (!question) return <QuickAiForm onSubmit={setQuestion} />;
  return <AnswerView question={question} selection={selection} onAskWithoutSelection={() => setSelection(undefined)} />;
}
