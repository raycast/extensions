import { List, ActionPanel, Action, Clipboard, showHUD } from "@raycast/api";
import { useState, useRef } from "react";
import { transliterate } from "./transliterate";
import { addToHistory } from "./history-utils";

export default function Command() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  function handleSearchChange(text: string) {
    setInput(text);
    setOutput(null);

    if (!text.trim()) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      requestId.current++; // invalidate any in-flight request
      setIsLoading(false);
      return;
    }

    // Mark loading immediately so the UI doesn't show a false "failed" state
    // during the debounce window.
    setIsLoading(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      const currentRequestId = ++requestId.current;
      try {
        const result = await transliterate(text);
        if (currentRequestId !== requestId.current) return;
        setOutput(result);
      } catch {
        if (currentRequestId !== requestId.current) return;
        setOutput(null);
      } finally {
        if (currentRequestId === requestId.current) setIsLoading(false);
      }
    }, 400); // wait 400ms after user stops typing
  }

  return (
    <List
      searchBarPlaceholder="Type Manglish (e.g. namaskaram, sakhavu, enthu)..."
      onSearchTextChange={handleSearchChange}
      isLoading={isLoading}
      throttle={false}
    >
      {output && !isLoading && (
        <>
          <List.Item
            title={output}
            subtitle="Malayalam Output"
            accessories={[{ text: `← ${input}` }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy to Clipboard"
                  onAction={async () => {
                    await Clipboard.copy(output);
                    await addToHistory(input, output);
                    await showHUD(`Copied: ${output}`);
                  }}
                />
                <Action
                  title="Paste to Active App"
                  onAction={async () => {
                    await Clipboard.paste(output);
                    await addToHistory(input, output);
                  }}
                />
                <Action
                  title="Copy Both"
                  onAction={async () => {
                    await Clipboard.copy(`${input} = ${output}`);
                    await addToHistory(input, output);
                    await showHUD("Copied both");
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item title={input} subtitle="Your Manglish input" accessories={[{ text: "Romanized" }]} />
        </>
      )}
      {output === null && !isLoading && input.trim() !== "" && (
        <List.Item title="Transliteration failed" subtitle="Check your connection and try again" />
      )}
      {output === null && !isLoading && input.trim() === "" && (
        <List.EmptyView title="Manglish Keyboard" description="Type anything in Manglish to get Malayalam script" />
      )}
    </List>
  );
}
