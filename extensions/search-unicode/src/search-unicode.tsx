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

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [data, setData] = useState<Entry[]>([]);

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
        console.log("Searching for:", searchText);
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
            "-l",
            "100",
            searchText,
          ]);
          output = [...searchOutput];
        } catch (error) {
          console.error("Error during search:", error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes("with exit code 1")) {
            // Exit code 1 happens when no results are found; ignore that
            await showToast({
              style: Toast.Style.Failure,
              title: "Execution Failed",
              message: errorMessage,
            });
          }
        }
        if (searchText.match(/((U\+)?[0-9A-Fa-f]+ ?)+$/)) {
          try {
            console.log("Performing hex search for:", searchText);
            const hexOutput = await run([
              "uni",
              "print",
              "-as",
              "json",
              "-c",
              "-f",
              "all",
              ...searchText.split(" "),
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

  const [columns, setColumns] = useState(5);
  return (
    <Grid
      onSearchTextChange={setSearchText}
      columns={columns}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      throttle
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
    >
      {data.length === 0 && !isLoading && searchText.length == 0 && (
        <Grid.EmptyView title="Type something to search Unicode" />
      )}
      {data.map((item) => (
        <Grid.Item
          key={item.hex}
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
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
