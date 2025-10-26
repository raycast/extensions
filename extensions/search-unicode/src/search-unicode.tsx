import { useEffect, useRef, useState } from "react";
import {
  ActionPanel,
  Action,
  Icon,
  Grid,
  showToast,
  Toast,
  showHUD,
  captureException,
} from "@raycast/api";
import { run } from "./exec";
import type { Entry } from "./types";
import { ItemDetails } from "./details";
import { getCharSvg } from "./utils";
import { SearchUnicodeTips } from "./search-unicode-tips";

const PATTERN_SINGLE_HEX = "((U\\+|0x|%x)?[0-9A-Fa-f]+)";
const PATTERN_SINGLE_BIN = "0b[01]+";
const PATTERN_SINGLE_DEC = "0d[0-9]+";
const PATTERN_SINGLE_OCT = "0o[0-7]+";
const PATTERN_SINGLE_VALUE = `(${PATTERN_SINGLE_HEX}|${PATTERN_SINGLE_BIN}|${PATTERN_SINGLE_DEC}|${PATTERN_SINGLE_OCT})`;

const PRINT_PATTERNS = [
  PATTERN_SINGLE_HEX,
  PATTERN_SINGLE_BIN,
  PATTERN_SINGLE_DEC,
  PATTERN_SINGLE_OCT,
  `${PATTERN_SINGLE_VALUE}(\\.\\.|-)${PATTERN_SINGLE_VALUE}`,
  `utf8:${PATTERN_SINGLE_HEX}`,
  `utf8:[0-9A-Fa-f]+`,
];

function parseSearchText(input: string): string[] {
  if (!input.trim()) {
    return [];
  }

  const args: string[] = [];
  let current = "";
  let inSingleQuotes = false;
  let inDoubleQuotes = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escaped) {
      // Handle escaped character
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      // Start escape sequence
      escaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuotes) {
      // Toggle single quote state
      inSingleQuotes = !inSingleQuotes;
      continue;
    }

    if (char === '"' && !inSingleQuotes) {
      // Toggle double quote state
      inDoubleQuotes = !inDoubleQuotes;
      continue;
    }

    if (!inSingleQuotes && !inDoubleQuotes && /\s/.test(char)) {
      // Whitespace outside quotes - end current argument
      if (current) {
        args.push(current);
        current = "";
      }
      // Skip consecutive whitespace
      while (i + 1 < input.length && /\s/.test(input[i + 1])) {
        i++;
      }
      continue;
    }

    // Regular character - add to current argument
    current += char;
  }

  // Add final argument if exists
  if (current) {
    args.push(current);
  }

  return args;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [data, setData] = useState<Entry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (!searchText) {
      setData([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        let output: Entry[] = [];
        try {
          const searchOutput = await run([
            "uni",
            "search",
            "-as",
            "json",
            "-c",
            "-f",
            "all",
            ...parseSearchText(searchText),
          ]);
          output = [...searchOutput];
        } catch (error) {
          console.error("Error during search:", error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes("code 1")) {
            // Exit code 1 happens when no results are found; ignore that
            await showToast({
              style: Toast.Style.Failure,
              title: "Execution Failed",
              message: errorMessage,
            });
          }
        }
        if (
          searchText.match(
            new RegExp(`^((${PRINT_PATTERNS.join("|")}) ?)+$`, "i"),
          )
        ) {
          try {
            const hexOutput = await run([
              "uni",
              "print",
              "-as",
              "json",
              "-c",
              "-f",
              "all",
              ...parseSearchText(searchText),
            ]);
            output = [...hexOutput, ...output];
          } catch (e) {
            console.error("Error during hex search:", e);
          }
        }
        setData(output);
      } catch (e) {
        console.error("Error during search:", e);
        captureException(e);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    }, 0);
  }, [searchText]);

  let navigationTitle: string | undefined = undefined;
  if (selectedId) {
    const selectedItem = data.find((item) => item.hex === selectedId);
    if (selectedItem) {
      navigationTitle = `Search Unicode – ${selectedItem.name}`;
    }
  }

  const [columns, setColumns] = useState(5);
  return (
    <Grid
      onSearchTextChange={setSearchText}
      columns={columns}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      throttle
      onSelectionChange={(id) => {
        setSelectedId(id);
      }}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setColumns(parseInt(newValue));
            setIsLoading(false);
          }}
        >
          <Grid.Dropdown.Item title="Large" value={"3"} />
          <Grid.Dropdown.Item title="Medium" value={"5"} />
          <Grid.Dropdown.Item title="Small" value={"8"} />
        </Grid.Dropdown>
      }
      actions={
        <ActionPanel>
          <SearchUnicodeTips />
        </ActionPanel>
      }
    >
      {data.length === 0 && !isLoading && searchText.length === 0 && (
        <Grid.EmptyView title="Type something to search Unicode" />
      )}
      {data.map((item) => (
        <Grid.Item
          key={item.hex}
          id={item.hex}
          content={{
            value: {
              source: getCharSvg(item, 100) /* tintColor: Color.PrimaryText */,
            },
            tooltip: item.name,
          }}
          title={item.name}
          subtitle={item.cpoint}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Paste
                  content={JSON.parse(`"${item.json}"`)}
                  onPaste={() => {
                    showHUD(`Pasted U+${item.hex} ${item.name}.`);
                  }}
                />
                <Action.CopyToClipboard
                  content={JSON.parse(`"${item.json}"`)}
                  title="Copy Character"
                />
                <Action.CopyToClipboard
                  content={item.hex}
                  title="Copy Hex Value"
                />
                <Action.CopyToClipboard content={item.name} title="Copy Name" />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Learn More"
                  icon={Icon.Sidebar}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "d" },
                    windows: { modifiers: ["ctrl"], key: "d" },
                  }}
                  target={<ItemDetails item={item} />}
                />
              </ActionPanel.Section>
              <SearchUnicodeTips />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
