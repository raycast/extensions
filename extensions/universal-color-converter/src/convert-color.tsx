import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Clipboard,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { parseColor, detectColorFormat } from "./utils/colorParsers";
import {
  convertToAllFormats,
  getPreferredFormat,
  type ColorOutput,
} from "./utils/colorConverters";

export default function ConvertColor() {
  const [searchText, setSearchText] = useState("");
  const [colorOutputs, setColorOutputs] = useState<ColorOutput[]>([]);
  const [inputFormat, setInputFormat] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const convertColor = async () => {
      if (!searchText.trim()) {
        setColorOutputs([]);
        setInputFormat("");
        setError("");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const format = detectColorFormat(searchText);

        if (format === "unknown") {
          setError(
            "Unrecognized color format. Please enter a valid hex, RGB, OKLCH, SwiftUI Color, or UIColor value.",
          );
          setColorOutputs([]);
          setInputFormat("");
          setIsLoading(false);
          return;
        }

        const parsedColor = parseColor(searchText);

        if (!parsedColor) {
          setError("Failed to parse color. Please check your input format.");
          setColorOutputs([]);
          setInputFormat("");
          setIsLoading(false);
          return;
        }

        const outputs = convertToAllFormats(parsedColor);
        // Filter out the input format from outputs
        const filteredOutputs = outputs.filter(
          (output) => output.format !== format,
        );

        setColorOutputs(filteredOutputs);
        setInputFormat(format);
        setError("");
      } catch {
        setError("An error occurred while converting the color.");
        setColorOutputs([]);
        setInputFormat("");
      }

      setIsLoading(false);
    };

    const timeoutId = setTimeout(convertColor, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [searchText]);

  const copyToClipboard = async (value: string, displayName: string) => {
    try {
      await Clipboard.copy(value);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to Clipboard",
        message: `${displayName}: ${value}`,
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Copy",
        message: "Could not copy to clipboard",
      });
    }
  };

  const getPreferredOutput = (): ColorOutput | null => {
    if (colorOutputs.length === 0) return null;

    const preferredFormat = getPreferredFormat(inputFormat);
    return (
      colorOutputs.find((output) => output.format === preferredFormat) ||
      colorOutputs[0]
    );
  };

  // No numeric shortcuts for now; primary action uses Enter.

  const renderColorPreview = (color: ColorOutput) => {
    // Try to parse the color value for preview
    const parsedForPreview = parseColor(color.value);
    if (parsedForPreview) {
      const { r, g, b, a = 1 } = parsedForPreview;
      const backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
      return {
        source: Icon.Circle,
        tintColor: { light: backgroundColor, dark: backgroundColor },
      };
    }
    return Icon.EyeDropper;
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Paste a color value (hex, RGB, OKLCH, SwiftUI Color, or UIColor)"
      throttle
    >
      {error ? (
        <List.Item title="Error" subtitle={error} icon={Icon.ExclamationMark} />
      ) : searchText && colorOutputs.length === 0 && !isLoading ? (
        <List.Item
          title="No Results"
          subtitle="Enter a valid color format to see conversions"
          icon={Icon.QuestionMark}
        />
      ) : (
        colorOutputs.map((output) => {
          const isPreferred = output === getPreferredOutput();

          return (
            <List.Item
              key={output.format}
              title={output.displayName}
              subtitle={output.value}
              icon={renderColorPreview(output)}
              accessories={[
                ...(isPreferred
                  ? [{ text: "⏎ Enter", tooltip: "Primary choice" }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Copy ${output.displayName}`}
                    onAction={() =>
                      copyToClipboard(output.value, output.displayName)
                    }
                    shortcut={
                      isPreferred ? { modifiers: [], key: "return" } : undefined
                    }
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}

      {!searchText && (
        <List.Item
          title="Universal Color Converter"
          subtitle="Paste any color format to see conversions"
          icon={Icon.EyeDropper}
        />
      )}
    </List>
  );
}
