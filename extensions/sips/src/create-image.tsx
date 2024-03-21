/**
 * @file create-image.tsx
 *
 * @summary Raycast command to create images with various patterns and dimensions.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:53:50
 * Last modified  : 2023-07-06 16:48:08
 */

import { Color, Grid } from "@raycast/api";

import { standardDimensions } from "./utilities/generators";
import SizeSelectionActionPanel from "./components/SizeSelectionActionPanel";

export default function Command() {
  const squareOptions = standardDimensions.map((width) =>
    standardDimensions
      .filter((height) => width == height)
      .map((height) => {
        return (
          <Grid.Item
            title={`${width}x${height}`}
            key={`${width}x${height}`}
            content={{ source: `thumbnails/${width}x${height}.webp` }}
            actions={<SizeSelectionActionPanel width={width} height={height} />}
          />
        );
      })
  );

  const wideOptions = standardDimensions.map((width) =>
    standardDimensions
      .filter((height) => width / height > 4 / 3 && width / height < 15 / 3)
      .map((height) => {
        return (
          <Grid.Item
            title={`${width}x${height}`}
            key={`${width}x${height}`}
            content={{ source: `thumbnails/${width}x${height}.webp`, tintColor: Color.Red }}
            actions={<SizeSelectionActionPanel width={width} height={height} />}
          />
        );
      })
  );

  const tallOptions = standardDimensions.map((width) =>
    standardDimensions
      .filter((height) => height / width > 4 / 3 && height / width < 15 / 3)
      .map((height) => {
        return (
          <Grid.Item
            title={`${width}x${height}`}
            key={`${width}x${height}`}
            content={{ source: `thumbnails/${width}x${height}.webp`, tintColor: Color.Green }}
            actions={<SizeSelectionActionPanel width={width} height={height} />}
          />
        );
      })
  );

  const extremeOptions = standardDimensions.map((width) =>
    standardDimensions
      .filter((height) => height / width > 15 / 3 || width / height > 15 / 3)
      .map((height) => {
        return (
          <Grid.Item
            title={`${width}x${height}`}
            key={`${width}x${height}`}
            content={{ source: `thumbnails/${width}x${height}.webp`, tintColor: Color.Blue }}
            actions={<SizeSelectionActionPanel width={width} height={height} />}
          />
        );
      })
  );

  return (
    <Grid
      navigationTitle="Image Size Options"
      searchBarPlaceholder="Search image sizes..."
      inset={Grid.Inset.Small}
      isLoading={false}
    >
      <Grid.Section title="Square">{squareOptions}</Grid.Section>
      <Grid.Section title="Wide">{wideOptions}</Grid.Section>
      <Grid.Section title="Tall">{tallOptions}</Grid.Section>
      <Grid.Section title="Extreme">{extremeOptions}</Grid.Section>
    </Grid>
  );
}
