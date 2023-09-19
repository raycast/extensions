/**
 * @file components/ImagePatternGrid.tsx
 *
 * @summary Grid view for selecting an image pattern to generate.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 11:44:03
 * Last modified  : 2023-07-06 14:52:12
 */

import { useEffect, useState } from "react";

import { Grid } from "@raycast/api";

import {
  generatePreview,
  generators,
  getCheckerboardOptions,
  getLenticularHaloOptions,
  getLinearGradientOptions,
  getRadialGradientOptions,
  getSolidColorOptions,
  getStarShineOptions,
  getStripeOptions,
  getSunbeamsOptions,
} from "../utilities/generators";
import { GeneratorOptions } from "../utilities/types";
import ImageGeneratorActionPanel from "./ImageGeneratorActionPanel";

/**
 * A grid of image patterns used to generate full-size renders.
 *
 * @param props.width The width of the image to generate.
 * @param props.height The height of the image to generate.
 * @returns A grid component.
 */
export default function ImagePatternGrid(props: { width: number; height: number }) {
  const { width, height } = props;

  const [loading, setLoading] = useState<boolean>(true);

  const [checkerboardItems, setCheckerboardItems] = useState<[string, GeneratorOptions][]>(Array(5).fill(["", {}]));
  const [stripeItems, setStripeItems] = useState<[string, GeneratorOptions][]>(Array(5).fill(["", {}]));
  const [solidColorItems, setSolidColorItems] = useState<[string, string, GeneratorOptions][]>(
    Array(10).fill(["", "", {}])
  );
  const [linearGradientItems, setLinearGradientItems] = useState<[string, GeneratorOptions][]>(Array(5).fill(["", {}]));
  const [radialGradientItems, setRadialGradientItems] = useState<[string, GeneratorOptions][]>(Array(5).fill(["", {}]));
  const [randomItem, setRandomItem] = useState<string>("");
  const [starShineItem, setStarShineItem] = useState<[string, GeneratorOptions]>(["", {}]);
  const [lenticularHaloItem, setLenticularHaloItem] = useState<[string, GeneratorOptions]>(["", {}]);
  const [sunbeamsItem, setSunbeamsItem] = useState<[string, GeneratorOptions]>(["", {}]);

  /**
   * Regenerates the colors used in the image patterns.
   *
   * @returns An object containing the new color values.
   */
  const regenerateColors = () => {
    const redValues = Array(10)
      .fill(0)
      .map(() => Math.floor(Math.random() * 256));
    const greenValues = Array(10)
      .fill(0)
      .map(() => Math.floor(Math.random() * 256));
    const blueValues = Array(10)
      .fill(0)
      .map(() => Math.floor(Math.random() * 256));
    const alphaValues = Array(10)
      .fill(0)
      .map(() => Math.floor(Math.random() * 256));
    return { redValues, greenValues, blueValues, alphaValues };
  };

  /**
   * Regenerates the pattern preview images.
   */
  const regeneratePreviews = async () => {
    setLoading(true);
    const { redValues, greenValues, blueValues, alphaValues } = regenerateColors();
    Promise.all([
      Promise.all(
        getCheckerboardOptions(redValues, greenValues, blueValues, alphaValues).map(async (options, index) => {
          const content = await generatePreview(generators.Checkerboard.CIFilterName, options);
          setCheckerboardItems((oldItems) => {
            const newItems = [...oldItems];
            newItems[index] = [content, options];
            return newItems;
          });
        })
      ),

      Promise.all(
        getStripeOptions(redValues, greenValues, blueValues, alphaValues).map(async (options, index) => {
          const content = await generatePreview(generators.Stripes.CIFilterName, options);
          setStripeItems((oldItems) => {
            const newItems = [...oldItems];
            newItems[index] = [content, options];
            return newItems;
          });
        })
      ),

      Promise.all(
        getSolidColorOptions(redValues, greenValues, blueValues).map(async (options, index) => {
          const content = await generatePreview(generators.ConstantColor.CIFilterName, options);
          setSolidColorItems((oldItems) => {
            const newItems = [...oldItems];
            newItems[index] = [
              content,
              `#${redValues[index].toString(16).padEnd(2, "0")}${greenValues[index]
                .toString(16)
                .padEnd(2, "0")}${blueValues[index].toString(16).padEnd(2, "0")}`,
              options,
            ];
            return newItems;
          });
        })
      ),

      Promise.all(
        getLinearGradientOptions(redValues, greenValues, blueValues, alphaValues).map(async (options, index) => {
          const content = await generatePreview(generators.LinearGradient.CIFilterName, options);
          setLinearGradientItems((oldItems) => {
            const newItems = [...oldItems];
            newItems[index] = [content, options];
            return newItems;
          });
        })
      ),

      Promise.all(
        getRadialGradientOptions(redValues, greenValues, blueValues, alphaValues).map(async (options, index) => {
          const content = await generatePreview(generators.RadialGradient.CIFilterName, options);
          setRadialGradientItems((oldItems) => {
            const newItems = [...oldItems];
            newItems[index] = [content, options];
            return newItems;
          });
        })
      ),

      Promise.resolve(
        (async () => {
          const content = await generatePreview(generators.Random.CIFilterName, {});
          setRandomItem(content);
        })()
      ),

      Promise.resolve(
        (async () => {
          const options = getStarShineOptions(redValues, greenValues, blueValues, alphaValues);
          const content = await generatePreview(generators.StarShine.CIFilterName, options);
          setStarShineItem([content, options]);
        })()
      ),

      Promise.resolve(
        (async () => {
          const options = getLenticularHaloOptions(redValues, greenValues, blueValues, alphaValues);
          const content = await generatePreview(generators.LenticularHalo.CIFilterName, options);
          setLenticularHaloItem([content, options]);
        })()
      ),

      Promise.resolve(
        (async () => {
          const options = getSunbeamsOptions(redValues, greenValues, blueValues, alphaValues);
          const content = await generatePreview(generators.Sunbeams.CIFilterName, options);
          setSunbeamsItem([content, options]);
        })()
      ),
    ]).then(() => setLoading(false));
  };

  useEffect(() => {
    regeneratePreviews();
  }, []);

  const checkerboardPreviews = checkerboardItems.map(([preview, options], index: number) => (
    <Grid.Item
      title={`Checkerboard ${index + 1}`}
      key={`Checkerboard ${index + 1}`}
      content={{ source: preview == "" ? generators.Checkerboard.thumbnail : preview }}
      actions={
        <ImageGeneratorActionPanel
          objectType="Checkerboard"
          generator={generators.Checkerboard}
          width={width}
          height={height}
          preview={preview}
          options={options}
          regeneratePreviews={regeneratePreviews}
        />
      }
    />
  ));

  const stripePreviews = stripeItems.map(([preview, options], index: number) => (
    <Grid.Item
      title={`Stripes ${index + 1}`}
      key={`Stripes ${index + 1}`}
      content={{ source: preview == "" ? generators.Stripes.thumbnail : preview }}
      actions={
        <ImageGeneratorActionPanel
          objectType="Stripes"
          generator={generators.Stripes}
          width={width}
          height={height}
          preview={preview}
          options={options}
          regeneratePreviews={regeneratePreviews}
        />
      }
    />
  ));

  const solidColorPreviews = solidColorItems.map(([preview, title, options], index: number) => {
    return (
      <Grid.Item
        title={title}
        key={`Solid Color ${index + 1}`}
        content={{ source: preview == "" ? generators.ConstantColor.thumbnail : preview }}
        actions={
          <ImageGeneratorActionPanel
            objectType={title}
            generator={generators.ConstantColor}
            width={width}
            height={height}
            preview={preview}
            options={options}
            regeneratePreviews={regeneratePreviews}
          />
        }
      />
    );
  });

  const linearGradientPreviews = linearGradientItems.map(([preview, options], index: number) => (
    <Grid.Item
      title={`Linear Gradient ${index + 1}`}
      key={`Linear Gradient ${index + 1}`}
      content={{ source: preview == "" ? generators.LinearGradient.thumbnail : preview }}
      actions={
        <ImageGeneratorActionPanel
          objectType="Linear Gradient"
          generator={generators.LinearGradient}
          width={width}
          height={height}
          preview={preview}
          options={options}
          regeneratePreviews={regeneratePreviews}
        />
      }
    />
  ));

  const radialGradientPreviews = radialGradientItems.map(([preview, options], index: number) => (
    <Grid.Item
      title={`Radial Gradient ${index + 1}`}
      key={`Radial Gradient ${index + 1}`}
      content={{ source: preview == "" ? generators.RadialGradient.thumbnail : preview }}
      actions={
        <ImageGeneratorActionPanel
          objectType="Radial Gradient"
          generator={generators.RadialGradient}
          width={width}
          height={height}
          preview={preview}
          options={options}
          regeneratePreviews={regeneratePreviews}
        />
      }
    />
  ));

  const randomPreview = (
    <Grid.Item
      title="Random"
      key="Random"
      content={{ source: randomItem == "" ? generators.Random.thumbnail : randomItem }}
      actions={
        <ImageGeneratorActionPanel
          objectType="Random"
          generator={generators.Random}
          width={width}
          height={height}
          preview={randomItem}
          options={{}}
          regeneratePreviews={regeneratePreviews}
        />
      }
    />
  );

  const starShinePreview = (
    <Grid.Item
      title="Star Shine"
      key="Star Shine"
      content={{ source: starShineItem[0] == "" ? generators.StarShine.thumbnail : starShineItem[0] }}
      actions={
        <ImageGeneratorActionPanel
          objectType="Star Shine"
          generator={generators.StarShine}
          width={width}
          height={height}
          preview={starShineItem[0]}
          options={starShineItem[1]}
          regeneratePreviews={regeneratePreviews}
        />
      }
    />
  );

  const lenticularHaloPreview = (
    <Grid.Item
      title="Lenticular Halo"
      key="Lenticular Halo"
      content={{ source: lenticularHaloItem[0] == "" ? generators.LenticularHalo.thumbnail : lenticularHaloItem[0] }}
      actions={
        <ImageGeneratorActionPanel
          objectType="Lenticular Halo"
          generator={generators.LenticularHalo}
          width={width}
          height={height}
          preview={lenticularHaloItem[0]}
          options={lenticularHaloItem[1]}
          regeneratePreviews={regeneratePreviews}
        />
      }
    />
  );

  const sunbeamsPreview = (
    <Grid.Item
      title="Sunbeams"
      key="Sunbeams"
      content={{ source: sunbeamsItem[0] == "" ? generators.Sunbeams.thumbnail : sunbeamsItem[0] }}
      actions={
        <ImageGeneratorActionPanel
          objectType="Sunbeams"
          generator={generators.Sunbeams}
          width={width}
          height={height}
          preview={sunbeamsItem[0]}
          options={sunbeamsItem[1]}
          regeneratePreviews={regeneratePreviews}
        />
      }
    />
  );

  return (
    <Grid navigationTitle="Image Pattern Options" isLoading={loading} inset={Grid.Inset.Small}>
      <Grid.Section title="Patterns">
        {checkerboardPreviews}
        {stripePreviews}
      </Grid.Section>

      <Grid.Section title="Solid Colors">{solidColorPreviews}</Grid.Section>

      <Grid.Section title="Gradients">
        {linearGradientPreviews}
        {radialGradientPreviews}
      </Grid.Section>

      <Grid.Section title="Other">
        {lenticularHaloPreview}
        {randomPreview}
        {starShinePreview}
        {sunbeamsPreview}
      </Grid.Section>
    </Grid>
  );
}
