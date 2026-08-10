import { List, Icon, ActionPanel, Action, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { trimText } from "./utils";
import { getColorType, dealWithOthers, dealWithNamedColor } from "./color";
import { ColorDescribe } from "./type";

interface EasydictArguments {
  queryText?: string;
}

export default function Command(props: LaunchProps<{ arguments: EasydictArguments }>) {
  const { queryText = "" } = props.arguments;

  const [inputText, setInputText] = useState<string>(trimText(queryText));

  const [colorResult, setColorResult] = useState<ColorDescribe[]>([]);

  function convertColor(str: string) {
    if (!str) {
      return;
    }
    const colorType = getColorType(str);
    const isNamedColor = colorType === "named";
    setColorResult(isNamedColor ? dealWithNamedColor(str) : dealWithOthers(str, colorType));
  }

  useEffect(() => {
    convertColor(inputText);
  }, [inputText]);

  return (
    <List searchBarPlaceholder={"Input color"} searchText={inputText} onSearchTextChange={setInputText} actions={null}>
      {colorResult.map((item) => {
        return (
          <List.Item
            key={item.title}
            icon={{
              source: Icon.CircleFilled,
              tintColor: {
                light: item.title,
                dark: item.title,
                adjustContrast: false,
              },
            }}
            subtitle={item.subtitle}
            title={item.title}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={item.title} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
