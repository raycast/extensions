import {
  ActionPanel,
  List,
  Action,
  showToast,
  Toast,
  captureException,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { run } from "./exec";
import type { Entry } from "./types";
import { ItemDetails } from "./details";
import { getCharSvg } from "./utils";
import { getPreferenceValues } from "@raycast/api";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [showDetails, setShowDetails] = useCachedState("show-details", false);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [data, setData] = useState<Entry[]>([]);
  const showEncodingsPref =
    getPreferenceValues<Preferences.IdentifyUnicode>().showEncodings;

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
        const output = await run([
          "uni",
          "identify",
          "-as",
          "json",
          "-c",
          "-f",
          "all",
          searchText,
        ]);
        setData(output);
      } catch (error) {
        console.error("Error during search:", error);
        setData([]);

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes("code 1")) {
          // Exit code 1 happens when no results are found; ignore that
          captureException(error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Execution Failed",
            message: errorMessage,
          });
        }
      } finally {
        setIsLoading(false);
      }
    }, 0);
  }, [searchText]);

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      isShowingDetail={showDetails}
      onSearchTextChange={setSearchText}
      throttle
    >
      {data.length === 0 && !isLoading && searchText.length === 0 && (
        <List.EmptyView title="Type something to identify Unicode codepoints" />
      )}
      {data?.length > 0 && showEncodingsPref && (
        <List.Section title="Encodings">
          <List.Item
            title="Hex Sequence in Unicode"
            subtitle={data ? data.map((item) => item.hex).join(" ") : ""}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={data ? data.map((item) => item.utf8).join(" ") : ""}
                  title="Copy Hex Sequence"
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Decimal Sequence in Unicode"
            subtitle={data ? data.map((item) => item.dec).join(" ") : ""}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={data ? data.map((item) => item.dec).join(" ") : ""}
                  title="Copy Decimal Sequence"
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="UTF-8 Sequence"
            subtitle={data ? data.map((item) => item.utf8).join(" ") : ""}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={data ? data.map((item) => item.utf8).join(" ") : ""}
                  title="Copy UTF-8 Sequence"
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="XML sequence"
            subtitle={data ? data.map((item) => item.xml).join(" ") : ""}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={data ? data.map((item) => item.xml).join(" ") : ""}
                  title="Copy XML Sequence"
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section
        title="Characters"
        subtitle={data ? data.length.toString() : "0"}
      >
        {Array.isArray(data)
          ? data.map((item, index) => {
              return (
                <List.Item
                  key={index}
                  icon={{
                    tooltip: item.char,
                    value: getCharSvg(item),
                  }}
                  title={item.name}
                  subtitle={item.cat.replace("_", " ")}
                  accessories={[{ text: item.cpoint }]}
                  detail={
                    <List.Item.Detail
                      markdown={`![${item.name}](${getCharSvg(item)})`}
                      metadata={
                        <List.Item.Detail.Metadata>
                          {item.aliases && (
                            <>
                              <List.Item.Detail.Metadata.TagList title="Aliases">
                                {item.aliases.split(", ").map((alias) => (
                                  <List.Item.Detail.Metadata.TagList.Item
                                    key={alias}
                                    text={alias}
                                  />
                                ))}
                              </List.Item.Detail.Metadata.TagList>
                              <List.Item.Detail.Metadata.Separator />
                            </>
                          )}

                          {item.cpoint && (
                            <List.Item.Detail.Metadata.Label
                              title="Codepoint"
                              text={item.cpoint}
                            />
                          )}
                          {item.block && (
                            <List.Item.Detail.Metadata.Label
                              title="Block"
                              text={item.block}
                            />
                          )}
                          {item.script && (
                            <List.Item.Detail.Metadata.Label
                              title="Script"
                              text={item.script}
                            />
                          )}
                          {item.cat && (
                            <List.Item.Detail.Metadata.Label
                              title="Category"
                              text={item.cat}
                            />
                          )}
                          {item.plane && (
                            <List.Item.Detail.Metadata.Label
                              title="Plane"
                              text={item.plane}
                            />
                          )}
                          {item.width && (
                            <List.Item.Detail.Metadata.Label
                              title="Character Width"
                              text={item.width}
                            />
                          )}
                          {item.cells && (
                            <List.Item.Detail.Metadata.Label
                              title="Number of Cells to Display as"
                              text={item.cells}
                            />
                          )}
                          {item.unicode && (
                            <List.Item.Detail.Metadata.Label
                              title="First Assigned in Unicode"
                              text={item.unicode}
                            />
                          )}
                          <List.Item.Detail.Metadata.Separator />

                          {item.hex && (
                            <List.Item.Detail.Metadata.Label
                              title="Hex"
                              text={item.hex}
                            />
                          )}
                          {item.dec && (
                            <List.Item.Detail.Metadata.Label
                              title="Dec"
                              text={item.dec}
                            />
                          )}
                          {item.oct && (
                            <List.Item.Detail.Metadata.Label
                              title="Oct"
                              text={item.oct}
                            />
                          )}
                          {item.bin && (
                            <List.Item.Detail.Metadata.Label
                              title="Bin"
                              text={item.bin}
                            />
                          )}
                          {item.utf8 && (
                            <List.Item.Detail.Metadata.Label
                              title="UTF-8"
                              text={item.utf8}
                            />
                          )}
                          {item.utf16be && (
                            <List.Item.Detail.Metadata.Label
                              title="UTF-16 BE"
                              text={item.utf16be}
                            />
                          )}
                          {item.utf16le && (
                            <List.Item.Detail.Metadata.Label
                              title="UTF-16 LE"
                              text={item.utf16le}
                            />
                          )}
                          <List.Item.Detail.Metadata.Separator />

                          {item.html && (
                            <List.Item.Detail.Metadata.Label
                              title="HTML entity"
                              text={item.html}
                            />
                          )}
                          {item.xml && (
                            <List.Item.Detail.Metadata.Label
                              title="XML entity"
                              text={item.xml}
                            />
                          )}
                          {item.json && (
                            <List.Item.Detail.Metadata.Label
                              title="JSON escape"
                              text={item.json}
                            />
                          )}
                          {item.digraph && (
                            <List.Item.Detail.Metadata.Label
                              title="Vim Digraph"
                              text={item.digraph}
                            />
                          )}
                          {item.keysym && (
                            <List.Item.Detail.Metadata.Label
                              title="X11 Keysym"
                              text={item.keysym}
                            />
                          )}
                          <List.Item.Detail.Metadata.Separator />

                          {item.props && (
                            <List.Item.Detail.Metadata.TagList title="Properties">
                              {item.props.split(", ").map((prop) => (
                                <List.Item.Detail.Metadata.TagList.Item
                                  key={prop}
                                  text={prop}
                                />
                              ))}
                            </List.Item.Detail.Metadata.TagList>
                          )}
                          {item.refs && (
                            <List.Item.Detail.Metadata.TagList title="Similars and Alternatives">
                              {item.refs.split(", ").map((ref) => (
                                <List.Item.Detail.Metadata.TagList.Item
                                  key={ref}
                                  text={ref}
                                />
                              ))}
                            </List.Item.Detail.Metadata.TagList>
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.Push
                          title="Learn More"
                          shortcut={{
                            macOS: { modifiers: ["cmd"], key: "d" },
                            windows: { modifiers: ["ctrl"], key: "d" },
                          }}
                          target={<ItemDetails item={item} />}
                        />
                        <Action
                          title={showDetails ? "Hide Details" : "Show Details"}
                          onAction={() => setShowDetails((x) => !x)}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.Paste content={JSON.parse(`"${item.json}"`)} />
                        <Action.CopyToClipboard
                          content={JSON.parse(`"${item.json}"`)}
                          title="Copy Character"
                        />
                        <Action.CopyToClipboard
                          content={item.hex}
                          title="Copy Hex Value"
                        />
                        <Action.CopyToClipboard
                          content={item.name}
                          title="Copy Name"
                        />
                        <Action.CopyToClipboard
                          content={item.block}
                          title="Copy Block"
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })
          : []}
      </List.Section>
    </List>
  );
}
