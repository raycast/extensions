import { ActionPanel, Action, List, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { caesarCipher, AlphabetType } from "./utils/caesar";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<{ shift: number; text: string }[]>([]);

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text) {
        setSearchText(text);
      }
    });
  }, []);

  useEffect(() => {
    if (!searchText) {
      setResults([]);
      return;
    }

    const newResults = [];
    let textToRotate = searchText;
    let specificShift = -1;

    // Check for " | N" syntax
    const pipeIndex = searchText.lastIndexOf("|");
    if (pipeIndex !== -1) {
      const splitText = searchText.slice(0, pipeIndex).trim();
      const possibleShift = searchText.slice(pipeIndex + 1).trim();
      const shiftNum = parseInt(possibleShift, 10);

      if (splitText && !isNaN(shiftNum)) {
        textToRotate = splitText;
        specificShift = shiftNum;
      }
    }

    if (specificShift !== -1) {
      // Show specific rotation
      // Normalize shift to 0-25 for display consistency or keep raw?
      // Usually ROT-N implies N % 26, but let's just use what user gave for calculation
      // and display it as requested.
      const rotated = caesarCipher(textToRotate, specificShift, AlphabetType.English);
      // Normalize shift for display label "ROT-N"
      let displayShift = specificShift % 26;
      if (displayShift < 0) displayShift += 26;

      newResults.push({ shift: displayShift, text: rotated });
    } else {
      // Generate all 26 rotations (0 to 25)
      for (let i = 0; i < 26; i++) {
        const rotated = caesarCipher(textToRotate, i, AlphabetType.English);
        newResults.push({ shift: i, text: rotated });
      }
    }
    setResults(newResults);
  }, [searchText]);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter text to rotate..."
      throttle
    >
      {results.length === 0 ? (
        <List.EmptyView title="ROT Cipher" description="Type text to see all 26 rotations." />
      ) : (
        results.map((item) => (
          <List.Item
            key={item.shift}
            title={item.text}
            subtitle={`ROT-${item.shift}`}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={item.text} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
