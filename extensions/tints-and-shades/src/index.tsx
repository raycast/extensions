import { Action, ActionPanel, Form, Icon, showToast, Toast, Grid } from "@raycast/api";
import { useState } from "react";

type ApiResponse = { [colorName: string]: ColorObject | null };

interface ColorObject {
  tints: { [key: string]: string };
  shades: { [key: string]: string };
}

interface RGB {
  r: number;
  g: number;
  b: number;
  hex?: string;
}

type GridItemProps = {
  colorKey: string;
  shade: string;
  hexCode: string;
  index: number;
  type: "tints" | "shades";
  apiResponse: object;
};

const CustomGridItem: React.FC<GridItemProps> = ({ colorKey, shade, hexCode, index, type, apiResponse }) => {
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
      title={`${colorKey}-${type.slice(0, -1)}-${index}`}
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
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);

  async function handleSubmit({ name, hex }: { name: string; hex: string }) {
    const cleanedName = name.replace(/[\s_]/g, "");
    const cleanedHex = hex.replace(/#/g, "");

    if (!cleanedName || !cleanedHex) {
      showToast({
        style: Toast.Style.Failure,
        title: `${!cleanedName ? "Color name" : "Hex value"} is required`,
      });
      return;
    }

    try {
      const colorObject = generateTintsAndShades(cleanedHex);
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
        apiResponse && <RenderNewUI apiResponse={apiResponse as unknown as ColorObject} />
      )}
    </>
  );
}

function RenderNewUI({ apiResponse }: { apiResponse: ColorObject }) {
  console.log(apiResponse);
  return (
    <>
      {Object.entries(apiResponse).map(([colorKey, colorValues]) => (
        <Grid key={colorKey}>
          <Grid.Section title="Tints" columns={6}>
            {Object.entries(colorValues.tints).map(([shade, hexCode], index) => (
              <CustomGridItem
                key={shade}
                colorKey={colorKey}
                shade={shade}
                hexCode={hexCode as string}
                index={index}
                type="tints"
                apiResponse={apiResponse}
              />
            ))}
          </Grid.Section>
          <Grid.Section title="Shades" columns={6}>
            {Object.entries(colorValues.shades).map(([shade, hexCode], index) => (
              <CustomGridItem
                key={shade}
                colorKey={colorKey}
                shade={shade}
                hexCode={hexCode as string}
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
  return hex.length == 1 ? "0" + hex : hex;
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

const hexToRgb = (hex: string): RGB | null => {
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
  return Math.round(color + (255 - color) * 1 * factor);
};

const getShade = (color: number, factor: number): number => {
  return Math.round(color * factor);
};

const generateTintsAndShades = (colorHex: string): ColorObject | null => {
  const color = hexToRgb(colorHex);

  if (color === null) return null;

  const colorObject: ColorObject = { tints: {}, shades: {} };
  let j = 0;

  for (let i = 0; i <= 1; i += 0.1) {
    j = Math.round(j * 10) / 10;

    const rgb: { tint: RGB; shade: RGB } = {
      tint: {
        r: getTint(color.r, j),
        g: getTint(color.g, j),
        b: getTint(color.b, j),
      },
      shade: {
        r: getShade(color.r, j),
        g: getShade(color.g, j),
        b: getShade(color.b, j),
      },
    };

    rgb.tint.hex = rgbToHex(rgb.tint.r, rgb.tint.g, rgb.tint.b);
    rgb.shade.hex = rgbToHex(rgb.shade.r, rgb.shade.g, rgb.shade.b);

    colorObject.tints[`${j * 10}`] = rgb.tint.hex;
    colorObject.shades[`${j * 10}`] = rgb.shade.hex;

    j += 0.1;
  }

  return colorObject;
};
