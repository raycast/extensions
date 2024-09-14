import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { CodeElementType, convertStringNamingStyle, generateNameSuggestions, NamingStyle } from "./utils";
import { StyleDropdown } from "./style-dropdown";

interface NameHandlerProps {
  codeElementType: CodeElementType;
}

export function UseNameGenerator({ codeElementType }: NameHandlerProps) {
  if (!codeElementType) {
    return <List.EmptyView title="Error" description="Invalid code element type" />;
  }

  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedNames, setGeneratedNames] = useState<string[]>([]);
  const [namingStyle, setNamingStyle] = useState<NamingStyle>(NamingStyle.CamelCase);

  const generateNames = async (newNamingStyle?: NamingStyle, isEmptyVal: boolean = true) => {
    if (searchText.length < 3) {
      return;
    }

    setIsLoading(true);

    await showToast({
      style: Toast.Style.Animated,
      title: "Generating Names",
      message: "Processing...",
    });

    try {
      const names = await generateNameSuggestions(
        codeElementType,
        searchText,
        isEmptyVal ? namingStyle : newNamingStyle || namingStyle,
      );
      setGeneratedNames(names);
      await showToast({
        style: Toast.Style.Success,
        title: "Generated Names",
        message: "Successfully generated names",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Error Generating Names`,
        message: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setGeneratedNames([]);
  }, [searchText]);

  const onStyleChange = async (newValue: string) => {
    setGeneratedNames([]);

    const newStyle = convertStringNamingStyle(newValue);
    setNamingStyle(newStyle);
    // await generateNames(newStyle, false);
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter description for your code element"
      throttle
      searchBarAccessory={<StyleDropdown onStyleChange={onStyleChange} />}
      actions={
        <ActionPanel>
          <Action title="Generate Names" onAction={generateNames} />
        </ActionPanel>
      }
    >
      <List.Section title="Generated names">
        {generatedNames.map((item) => (
          <List.Item
            key={item}
            title={item}
            icon={Icon.Circle}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={item} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
