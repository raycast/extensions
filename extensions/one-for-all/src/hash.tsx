import { ActionPanel, Action, List, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import crypto from "crypto";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text) {
        setSearchText(text);
      }
    });
  }, []);

  const getHashes = (input: string) => {
    if (!input) return [];

    // Parse input for recursion: "text | count"
    let textToHash = input;
    let iterations = 1;

    // Check for pipe syntax
    const pipeIndex = input.lastIndexOf("|");
    if (pipeIndex !== -1) {
      const potentialCount = input.slice(pipeIndex + 1).trim();
      const potentialText = input.slice(0, pipeIndex).trim();
      if (/^\d+$/.test(potentialCount)) {
        iterations = parseInt(potentialCount, 10);
        textToHash = potentialText;
      }
    }

    if (!textToHash) return [];
    // Limit iterations to prevent freezing
    if (iterations > 10000) iterations = 10000;
    if (iterations < 1) iterations = 1;

    const algos = ["md5", "sha1", "sha256", "sha512"];
    const results = [];

    // Standard Hashes
    for (const algo of algos) {
      let currentHash = textToHash;
      try {
        for (let i = 0; i < iterations; i++) {
          currentHash = crypto.createHash(algo).update(currentHash).digest("hex");
        }
        results.push({
          algo,
          hash: currentHash,
          rounds: iterations,
          details: `${algo.toUpperCase()}${iterations > 1 ? ` (${iterations} rounds)` : ""}`,
        });
      } catch {
        // Ignore unsupported
      }
    }
    return results;
  };

  const results = getHashes(searchText);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter text to hash (e.g. 'admin' or 'admin | 5')..."
      throttle
    >
      {results.length === 0 ? (
        <List.EmptyView title="Type something to hash" description="Use 'text | N' to hash N times recursively" />
      ) : (
        results.map((item) => (
          <List.Item
            key={item.algo}
            title={item.hash}
            subtitle={item.details}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={item.hash} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
