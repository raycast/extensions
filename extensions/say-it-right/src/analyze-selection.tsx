import { getSelectedText } from "@raycast/api";
import { useEffect, useState } from "react";
import { AnalyzeView } from "./AnalyzeView";
import { TextInputForm } from "./components/TextInputForm";
import { AnalysisPlaceholder } from "./components/AnalysisDetail";

export default function Command() {
  const [text, setText] = useState<string | null>(null);
  const [needsInput, setNeedsInput] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const sel = (await getSelectedText())?.trim();
        if (sel) setText(sel);
        else setNeedsInput(true);
      } catch {
        setNeedsInput(true);
      }
    })();
  }, []);

  if (text) return <AnalyzeView text={text} />;
  if (needsInput) return <TextInputForm onSubmit={(t) => setText(t.trim())} />;
  return <AnalysisPlaceholder isLoading={true} />;
}
