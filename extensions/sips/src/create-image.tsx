/**
 * @file create-image.tsx
 *
 * @summary Raycast command to create images with various patterns and dimensions.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:53:50
 * Last modified  : 2024-06-26 21:37:46
 */

import { Color, Grid, LaunchProps, useNavigation } from "@raycast/api";
import { useEffect, useRef } from "react";

import ImagePatternGrid from "./components/ImagePatternGrid";
import SizeSelectionActionPanel from "./components/SizeSelectionActionPanel";
import { standardDimensions } from "./utilities/generators";

export default function Command(props: LaunchProps) {
  const viewRef = useRef(false);
  const { push } = useNavigation();

  useEffect(() => {
    if (props.launchContext && !viewRef.current) {
      viewRef.current = true;
      const { imageWidth, imageHeight, imagePattern } = props.launchContext;
      push(<ImagePatternGrid width={imageWidth} height={imageHeight} pattern={imagePattern} />);
    }
  }, [props.launchContext]);

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
      }),
  );

  const wideOptions = standardDimensions.map((width) =>
    standardDimensions
      .filter((height) => width / height > 4 / 3 && width / height < 15 / 3)
      .map((height) => {
        return (
          <Grid.Item
            title={`${width}x${height}`}
            key={`${width}x${height}`}
            content={{
              source: `thumbnails/${width}x${height}.webp`,
              tintColor: Color.Red,
            }}
            actions={<SizeSelectionActionPanel width={width} height={height} />}
          />
        );
      }),
  );

  const tallOptions = standardDimensions.map((width) =>
    standardDimensions
      .filter((height) => height / width > 4 / 3 && height / width < 15 / 3)
      .map((height) => {
        return (
          <Grid.Item
            title={`${width}x${height}`}
            key={`${width}x${height}`}
            content={{
              source: `thumbnails/${width}x${height}.webp`,
              tintColor: Color.Green,
            }}
            actions={<SizeSelectionActionPanel width={width} height={height} />}
          />
        );
      }),
  );

  const extremeOptions = standardDimensions.map((width) =>
    standardDimensions
      .filter((height) => height / width > 15 / 3 || width / height > 15 / 3)
      .map((height) => {
        return (
          <Grid.Item
            title={`${width}x${height}`}
            key={`${width}x${height}`}
            content={{
              source: `thumbnails/${width}x${height}.webp`,
              tintColor: Color.Blue,
            }}
            actions={<SizeSelectionActionPanel width={width} height={height} />}
          />
        );
      }),
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
