import { Detail, getSelectedText } from "@raycast/api";
import { useEffect, useState } from "react";
import { SearchView } from "./components/SearchView";

export default function Command() {
  const [selectedText, setSelectedText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSelectedText()
      .then((text) => setSelectedText(text.trim()))
      .catch(() => setSelectedText(""))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading)
    return <Detail isLoading markdown="Loading selected text..." />;
  return (
    <SearchView
      kind="screen"
      initialSearchText={selectedText}
      navigationTitle="Search Selected Text"
    />
  );
}
