import { useState } from "react";
import { AnalyzeView } from "./AnalyzeView";
import { TextInputForm } from "./components/TextInputForm";

export default function Command() {
  const [text, setText] = useState<string | null>(null);
  if (text) return <AnalyzeView text={text} />;
  return <TextInputForm onSubmit={(t) => setText(t.trim())} />;
}
