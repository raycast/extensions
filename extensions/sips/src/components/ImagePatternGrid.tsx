/**
 * @file components/ImagePatternGrid.tsx
 *
 * @summary Grid view for selecting an image pattern to generate.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 11:44:03
 * Last modified  : 2024-06-26 21:37:46
 */

import os from "os";
import path from "path";

import { Grid, Toast, getPreferenceValues, showInFinder, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";

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
import { cleanup, getDestinationPaths, moveImageResultsToFinalDestination, showErrorToast } from "../utilities/utils";

import ImageGeneratorActionPanel from "./ImageGeneratorActionPanel";

/**
 * A grid of image patterns used to generate full-size renders.
 *
 * @param props.width The width of the image to generate.
 * @param props.height The height of the image to generate.
 * @returns A grid component.
 */
export default function ImagePatternGrid(props: {
  width: number;
  height: number;
  pattern?: { name: string; options: GeneratorOptions };
}) {
  const { width, height, pattern } = props;

  const [loading, setLoading] = useState<boolean>(true);

  const [checkerboardItems, setCheckerboardItems] = useState<[string, GeneratorOptions][]>(Array(5).fill(["", {}]));
  const [stripeItems, setStripeItems] = useState<[string, GeneratorOptions][]>(Array(5).fill(["", {}]));
  const [solidColorItems, setSolidColorItems] = useState<[string, string, GeneratorOptions][]>(
    Array(10).fill(["", "", {}]),
  );
  const [linearGradientItems, setLinearGradientItems] = useState<[string, GeneratorOptions][]>(Array(5).fill(["", {}]));
  const [radialGradientItems, setRadialGradientItems] = useState<[string, GeneratorOptions][]>(Array(5).fill(["", {}]));
  const [randomItem, setRandomItem] = useState<string>("");
  const [starShineItem, setStarShineItem] = useState<[string, GeneratorOptions]>(["", {}]);
  const [lenticularHaloItem, setLenticularHaloItem] = useState<[string, GeneratorOptions]>(["", {}]);
  const [sunbeamsItem, setSunbeamsItem] = useState<[string, GeneratorOptions]>(["", {}]);
  const [currentColors, setCurrentColors] = useState<string[]>();
  const preferences = getPreferenceValues<Preferences.CreateImage>();

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

    setCurrentColors(
      redValues.map((red, index) => {
        return `#${red.toString(16).padEnd(2, "0")}${greenValues[index].toString(16).padEnd(2, "0")}${blueValues[index]
          .toString(16)
          .padEnd(2, "0")}`;
      }),
    );

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
          const baseThumbnail = generators.Checkerboard.thumbnail;
          const indexThumbnail = index > 0 ? baseThumbnail.replace(".", `${index + 1}.`) : baseThumbnail;
          const content = preferences.generatePreviews
            ? await generatePreview(generators.Checkerboard.CIFilterName, options)
            : indexThumbnail;
          setCheckerboardItems((oldItems) => {
            const newItems = [...oldItems];
            newItems[index] = [content, options];
            return newItems;
          });
        }),
      ),

      Promise.all(
        getStripeOptions(redValues, greenValues, blueValues, alphaValues).map(async (options, index) => {
          const content = preferences.generatePreviews
            ? await generatePreview(generators.Stripes.CIFilterName, options)
            : generators.Stripes.thumbnail;
          setStripeItems((oldItems) => {
            const newItems = [...oldItems];
            newItems[index] = [content, options];
            return newItems;
          });
        }),
      ),

      Promise.all(
        getSolidColorOptions(redValues, greenValues, blueValues).map(async (options, index) => {
          const color = `#${redValues[index].toString(16).padEnd(2, "0")}${greenValues[index]
            .toString(16)
            .padEnd(2, "0")}${blueValues[index].toString(16).padEnd(2, "0")}`;
          const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="100" height="100" fill="${color}" />
            </svg>`;
          const svgBase64 = Buffer.from(svg).toString("base64");
          const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;

          const content = preferences.generatePreviews
            ? await generatePreview(generators.ConstantColor.CIFilterName, options)
            : svgDataUrl;
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
        }),
      ),

      Promise.all(
        getLinearGradientOptions(redValues, greenValues, blueValues, alphaValues).map(async (options, index) => {
          const content = preferences.generatePreviews
            ? await generatePreview(generators.LinearGradient.CIFilterName, options)
            : generators.LinearGradient.thumbnail;
          setLinearGradientItems((oldItems) => {
            const newItems = [...oldItems];
            newItems[index] = [content, options];
            return newItems;
          });
        }),
      ),

      Promise.all(
        getRadialGradientOptions(redValues, greenValues, blueValues, alphaValues).map(async (options, index) => {
          const content = preferences.generatePreviews
            ? await generatePreview(generators.RadialGradient.CIFilterName, options)
            : generators.RadialGradient.thumbnail;
          setRadialGradientItems((oldItems) => {
            const newItems = [...oldItems];
            newItems[index] = [content, options];
            return newItems;
          });
        }),
      ),

      Promise.resolve(
        (async () => {
          const content = preferences.generatePreviews
            ? await generatePreview(generators.Random.CIFilterName, {})
            : generators.Random.thumbnail;
          setRandomItem(content);
        })(),
      ),

      Promise.resolve(
        (async () => {
          const options = getStarShineOptions(redValues, greenValues, blueValues, alphaValues);
          const content = preferences.generatePreviews
            ? await generatePreview(generators.StarShine.CIFilterName, options)
            : generators.StarShine.thumbnail;
          setStarShineItem([content, options]);
        })(),
      ),

      Promise.resolve(
        (async () => {
          const options = getLenticularHaloOptions(redValues, greenValues, blueValues, alphaValues);
          const content = preferences.generatePreviews
            ? await generatePreview(generators.LenticularHalo.CIFilterName, options)
            : generators.LenticularHalo.thumbnail;
          setLenticularHaloItem([content, options]);
        })(),
      ),

      Promise.resolve(
        (async () => {
          const options = getSunbeamsOptions(redValues, greenValues, blueValues, alphaValues);
          const content = preferences.generatePreviews
            ? await generatePreview(generators.Sunbeams.CIFilterName, options)
            : generators.Sunbeams.thumbnail;
          setSunbeamsItem([content, options]);
        })(),
      ),
    ]).then(() => setLoading(false));
  };

  const checkerboardPreviews = checkerboardItems.map(([preview, options], index: number) => (
    <Grid.Item
      title={`Checkerboard ${index + 1}`}
      key={`Checkerboard ${index + 1}`}
      content={{
        source: preview == "" ? generators.Checkerboard.thumbnail : preview,
        tintColor: currentColors?.[index],
      }}
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
      content={{
        source: preview == "" ? generators.Stripes.thumbnail : preview,
        tintColor: currentColors?.[index],
      }}
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
        content={{
          source: preview == "" ? generators.Checkerboard.thumbnail : preview,
        }}
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
      content={{
        source: preview == "" ? generators.LinearGradient.thumbnail : preview,
        tintColor: currentColors?.[index],
      }}
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
      content={{
        source: preview == "" ? generators.RadialGradient.thumbnail : preview,
        tintColor: currentColors?.[index],
      }}
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
      content={{
        source: randomItem == "" ? generators.Random.thumbnail : randomItem,
      }}
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
      content={{
        source: starShineItem[0] == "" ? generators.StarShine.thumbnail : starShineItem[0],
      }}
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
      content={{
        source: lenticularHaloItem[0] == "" ? generators.LenticularHalo.thumbnail : lenticularHaloItem[0],
      }}
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
      content={{
        source: sunbeamsItem[0] == "" ? generators.Sunbeams.thumbnail : sunbeamsItem[0],
      }}
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

  const viewRef = useRef(false);
  useEffect(() => {
    if (pattern && !viewRef.current) {
      viewRef.current = true;

      let generator = generators.Checkerboard;
      const options = pattern.options;
      if (pattern.name === "Stripes") {
        generator = generators.Stripes;
      } else if (pattern.name.startsWith("#")) {
        generator = generators.ConstantColor;
      } else if (pattern.name === "Linear Gradient") {
        generator = generators.LinearGradient;
      } else if (pattern.name === "Radial Gradient") {
        generator = generators.RadialGradient;
      } else if (pattern.name === "Random") {
        generator = generators.Random;
      } else if (pattern.name === "Star Shine") {
        generator = generators.StarShine;
      } else if (pattern.name === "Lenticular Halo") {
        generator = generators.LenticularHalo;
      } else if (pattern.name === "Sunbeams") {
        generator = generators.Sunbeams;
      }

      Promise.resolve(
        getDestinationPaths([path.join(os.tmpdir(), `${pattern.name.replaceAll(" ", "_").toLowerCase()}.png`)], true),
      ).then(async (destinations) => {
        const toast = await showToast({
          title: `Creating ${pattern.name}...`,
          style: Toast.Style.Animated,
        });
        try {
          await generator.applyMethod(destinations[0], generator.CIFilterName, width, height, options);
          await moveImageResultsToFinalDestination(destinations);
          toast.title = `Created ${pattern.name}`;
          toast.style = Toast.Style.Success;
          showInFinder(destinations[0]);
        } catch (error) {
          await showErrorToast(`Failed To Create ${pattern.name}`, error as Error, toast);
        } finally {
          cleanup();
        }
        regeneratePreviews();
      });
    } else if (!pattern && !viewRef.current) {
      viewRef.current = true;
      regeneratePreviews();
    }
  }, [pattern]);

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
