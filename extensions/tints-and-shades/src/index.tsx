import { Action, ActionPanel, Form, Icon, showToast, Toast, Grid } from "@raycast/api";
import { useState } from "react";

interface ColorObject {
  tints: { [key: string]: string };
  shades: { [key: string]: string };
}

type ApiResponse = { [colorName: string]: ColorObject };

interface GridItemProps {
  colorKey: string;
  shade: string;
  hexCode: string;
  index: number;
  type: "tints" | "shades";
  apiResponse: ApiResponse;
}

const CustomGridItem: React.FC<GridItemProps> = ({ colorKey, shade, hexCode, index, type, apiResponse }) => {
  let titleSuffix;
  let subtitle;
  const gridTitle = hexCode.toUpperCase();

  if (type === "tints") {
    titleSuffix = (10 - index) * 10;
    subtitle = `+${titleSuffix}%`;
    if (titleSuffix === 0) subtitle = "Base Color";
  } else {
    titleSuffix = index * 10;
    subtitle = `-${titleSuffix}%`;
    if (titleSuffix === 0) subtitle = "Base Color";
  }

  return (
    <Grid.Item
      key={`${colorKey}-${type}-${shade}`}
      content={{
        color: {
          light: hexCode,
          dark: hexCode,
          adjustContrast: false,
        },
      }}
      title={`${gridTitle}`}
      subtitle={subtitle}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Hex Value" icon={Icon.Hashtag} content={hexCode} />
          <Action.CopyToClipboard title="Copy JSON" icon={Icon.CodeBlock} content={JSON.stringify(apiResponse)} />
        </ActionPanel>
      }
    />
  );
};

export default function Command() {
  const [showForm, setShowForm] = useState<boolean>(true);
  const [apiResponse, setApiResponse] = useState<ApiResponse>({});

  async function handleSubmit({ name, hex }: { name: string; hex: string }) {
    const cleanedName = name.trim();
    let cleanedHex = hex.trim().replace(/\s+/g, "").replace(/#/g, "");

    if (!cleanedName || !cleanedHex) {
      showToast({
        style: Toast.Style.Failure,
        title: `${!cleanedName ? "Color name" : "Hex value"} is required`,
      });
      return;
    }
    if (cleanedHex.length > 6) {
      cleanedHex = cleanedHex.substring(0, 6);
    } else if (cleanedHex.length < 6) {
      cleanedHex = cleanedHex.padEnd(6, "f");
    }

    try {
      const colorObject = generateTintsAndShades(cleanedHex);
      if (!colorObject) {
        throw new Error("Invalid color hex value");
      }

      const response: ApiResponse = { [cleanedName]: colorObject };
      setApiResponse(response);
      setShowForm(false);

      showToast({
        style: Toast.Style.Success,
        title: "Generated tints & shades",
        message: "Copied link to clipboard",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed generating tints & shades",
        message: String(error),
      });
    }
  }

  return (
    <>
      {showForm ? (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm icon={Icon.Upload} title="Generate Tints & Shades" onSubmit={handleSubmit} />
            </ActionPanel>
          }
        >
          <Form.TextArea id="name" title="Name" placeholder="Enter color name" storeValue />
          <Form.TextArea id="hex" title="Hex" placeholder="Enter a hex value" storeValue />
        </Form>
      ) : (
        <RenderNewUI apiResponse={apiResponse} />
      )}
    </>
  );
}

function RenderNewUI({ apiResponse }: { apiResponse: ApiResponse }) {
  return (
    <>
      {Object.entries(apiResponse).map(([colorKey, colorValues]) => (
        <Grid key={colorKey}>
          <Grid.Section title="Tints" columns={7}>
            {Object.entries(colorValues.tints).map(([shade, hexCode], index) => (
              <CustomGridItem
                key={shade}
                colorKey={colorKey}
                shade={shade}
                hexCode={hexCode}
                index={index}
                type="tints"
                apiResponse={apiResponse}
              />
            ))}
          </Grid.Section>
          <Grid.Section title="Shades" columns={7}>
            {Object.entries(colorValues.shades).map(([shade, hexCode], index) => (
              <CustomGridItem
                key={shade}
                colorKey={colorKey}
                shade={shade}
                hexCode={hexCode}
                index={index}
                type="shades"
                apiResponse={apiResponse}
              />
            ))}
          </Grid.Section>
        </Grid>
      ))}
    </>
  );
}

// Color palette generation functions

const componentToHex = (c: number): string => {
  const hex = c.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const getTint = (color: number, factor: number): number => {
  return Math.round(color + (255 - color) * factor);
};

const getShade = (color: number, factor: number): number => {
  return Math.round(color * factor);
};

const generateTintsAndShades = (colorHex: string): ColorObject | null => {
  const color = hexToRgb(colorHex);
  if (!color) return null;

  const colorObject: ColorObject = { tints: {}, shades: {} };
  for (let i = 0; i <= 10; i++) {
    const factor = i / 10;

    colorObject.tints[`${(10 - i) * 10}`] = rgbToHex(
      getTint(color.r, factor),
      getTint(color.g, factor),
      getTint(color.b, factor)
    );

    colorObject.shades[`${(10 - i) * 10}`] = rgbToHex(
      getShade(color.r, factor),
      getShade(color.g, factor),
      getShade(color.b, factor)
    );
  }

  return colorObject;
};
