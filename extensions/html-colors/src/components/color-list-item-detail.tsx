import { List, Icon } from "@raycast/api";
import { ColorWithCategories } from "../types";
import { generateColorPreviewSvg } from "../utils/color-utils";

function formatCategories(categories: ColorWithCategories["categories"]): string {
  return categories.map((cat) => cat.charAt(0).toUpperCase() + cat.slice(1)).join(", ");
}

function getCategoryIcon(categories: ColorWithCategories["categories"]): Icon {
  return categories.includes("basic") ? Icon.Circle : Icon.CircleEllipsis;
}

function Metadata({ color }: { color: ColorWithCategories }) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Categories"
        text={formatCategories(color.categories)}
        icon={getCategoryIcon(color.categories)}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Name" text={color.name} />
      <List.Item.Detail.Metadata.Label title="Named color" text={color.id} />
      <List.Item.Detail.Metadata.Label title="HEX" text={color.hex} />
      <List.Item.Detail.Metadata.Label title="RGB" text={color.rgb} />
    </List.Item.Detail.Metadata>
  );
}

/**
 * Detail component for displaying color preview and metadata.
 * Shows a color swatch and detailed information about the color.
 */
export function ColorListItemDetail({ color }: { color: ColorWithCategories }) {
  const colorImageMarkdown = generateColorPreviewSvg(color.hex, color.name);

  return <List.Item.Detail markdown={colorImageMarkdown} metadata={<Metadata color={color} />} />;
}
