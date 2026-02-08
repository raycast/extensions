import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import TransformationList from "./components/TransformationList";
import { getTextFromSelection } from "./utils/text-retrieval";

export default function TransformSelectedText() {
  const [text, setText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadText() {
      const selectedText = await getTextFromSelection();
      setText(selectedText);
      setIsLoading(false);
    }
    loadText();
  }, []);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  return <TransformationList inputText={text} />;
}
