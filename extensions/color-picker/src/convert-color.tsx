import { getSelectedText, LaunchProps, List, LocalStorage } from "@raycast/api";
import { ColorConvertListItem } from "./components/ColorConvert";
import { useEffect, useState, useRef } from "react";
import { ColorFormatType } from "./lib/types";
import { getFormattedColor } from "./lib/utils";

export default function ConvertColor(props: LaunchProps<{ arguments: Arguments.ConvertColor }>) {
  const [colorText, setColorText] = useState(props.arguments.text ?? "");
  const [lastConvertedColorFormat, setLastConvertedColorFormat] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  // For Windows since strict mode causes useEffect to run twice,
  // we need to make sure it only runs once to avoid flicker.
  // Can be removed once strict mode option is added in Windows.
  const hasInitialized = useRef(false);
  const hasEditedColor = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function getLastFormatAndText() {
      setIsLoading(true);
      const lastFormat = await LocalStorage.getItem<string>("lastConvertedColorFormat").catch(() => undefined);
      setLastConvertedColorFormat(lastFormat);

      if (!colorText) {
        const selectedText = await getSelectedText().catch(() => "");
        if (!hasEditedColor.current) {
          setColorText(selectedText);
        }
      }
      setIsLoading(false);
    }

    getLastFormatAndText();
  }, []);

  const format: { title: string; subtitle: string; value: ColorFormatType }[] = [
    { title: "HEX", subtitle: "#FF6363", value: "hex" },
    { title: "HEX Lower Case", subtitle: "#ff6363", value: "hex-lower-case" },
    { title: "HEX No Prefix", subtitle: "FF6363", value: "hex-no-prefix" },
    { title: "RGB", subtitle: "rgb(255 99 99 / 100%)", value: "rgb" },
    { title: "RGB %", subtitle: "rgb(100% 38% 38% / 100%)", value: "rgb-percentage" },
    { title: "RGBA", subtitle: "rgba(255, 99, 99, 1)", value: "rgba" },
    { title: "RGBA %", subtitle: "rgba(100%, 39%, 39%, 1)", value: "rgba-percentage" },
    { title: "HSLA", subtitle: "hsla(0, 100%, 69%, 1)", value: "hsla" },
    { title: "HSVA", subtitle: "color(hsv 43.082 81.145 100)", value: "hsva" },
    { title: "OKLCH", subtitle: "oklch(0.6987 0.1902 23.468)", value: "oklch" },
    { title: "LCH", subtitle: "lch(63.127 68.676 28.723)", value: "lch" },
    { title: "P3", subtitle: "color(display-p3 0.9248 0.428 0.4078)", value: "p3" },
  ];

  if (lastConvertedColorFormat) {
    const index = format.findIndex((item) => item.value === lastConvertedColorFormat);
    if (index !== -1) {
      const [lastFormat] = format.splice(index, 1);
      format.unshift(lastFormat);
    }
  }

  let convertedColors: { title: string; value: ColorFormatType; convertedColor: string }[] = [];
  if (colorText.trim()) {
    try {
      convertedColors = format.map((item) => ({
        ...item,
        convertedColor: getFormattedColor(colorText.trim(), item.value),
      }));
    } catch {
      // Incomplete input is expected while typing; show the empty view until it is valid.
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={colorText}
      onSearchTextChange={(text) => {
        hasEditedColor.current = true;
        setColorText(text);
      }}
      searchBarPlaceholder="Type or paste a color..."
    >
      {convertedColors.map((item) => (
        <ColorConvertListItem key={item.value} {...item} />
      ))}
      <List.EmptyView
        title={colorText.trim() ? "Invalid color" : "Enter a color"}
        description="Type or paste a CSS color, such as #FF6363, rgb(255 99 99), or color(display-p3 1 0 0)."
      />
    </List>
  );
}
