import { Grid } from "@raycast/api";
import { ImageTypeAccessoryProps } from "../types";

export default function ImageTypeAccessory({ setViewType }: ImageTypeAccessoryProps) {
  return (
    <Grid.Dropdown tooltip="Image Type" storeValue onChange={(newValue) => setViewType(newValue)}>
      <Grid.Dropdown.Item title="All Types" value="all" />
      <Grid.Dropdown.Item title="BMP" value="bmp" />
      <Grid.Dropdown.Item title="GIF" value="gif" />
      <Grid.Dropdown.Item title="JPEG" value="jpeg" />
      <Grid.Dropdown.Item title="PNG" value="png" />
      <Grid.Dropdown.Item title="WebP" value="webp" />
      <Grid.Dropdown.Item title="SVG" value="svg" />
      <Grid.Dropdown.Item title="AVIF" value="avif" />
      <Grid.Dropdown.Item title="Color" value="color" />
      <Grid.Dropdown.Item title="Gray" value="gray" />
      <Grid.Dropdown.Item title="Mono" value="mono" />
      <Grid.Dropdown.Item title="Transparent" value="trans" />
    </Grid.Dropdown>
  );
}
