import { List, Icon, ActionPanel, Action, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { trimText } from "./utils";
import { getColorType, dealWithOthers, dealWithNamedColor } from "./color";

interface EasydictArguments {
  queryText?: string;
}

export default function Command(props: LaunchProps<{ arguments: EasydictArguments }>) {
  const [inputText, setInputText] = useState<string>();
  const { queryText } = props.arguments;
  const trimQueryText = queryText ? trimText(queryText) : props.fallbackText;
  const [colorResult, setColorResult] = useState<any[]>([]);
  function onInputChange(text: string) {
    setInputText(text)
    convertColor(text as string)
  }

  useEffect(() => {
    if (inputText === undefined) {
      setup();
    }
  }, [inputText])

  function setup() {
    if (trimQueryText?.length) {
      console.warn(`---> arguments queryText: ${trimQueryText}`);
    }
    const userInputText = trimQueryText;
    if (userInputText?.length) {
      setInputText(userInputText)
      convertColor(userInputText as string)
    }
  }

  function convertColor(str: string) {
    if (!str) {
      return
    }
    const colorType = getColorType(str)
    const isNamedColor = colorType === 'named';
    setColorResult(isNamedColor
      ? dealWithNamedColor(str)
      : dealWithOthers(str, colorType))
  }

  return (
    <List searchBarPlaceholder={"Input color"}
      searchText={inputText}
      onSearchTextChange={onInputChange} actions={null}>
      {
        colorResult.map(item => {
          return <List.Item
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
        })
      }
    </List>
  );
}


