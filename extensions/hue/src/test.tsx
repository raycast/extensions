import { Grid } from "@raycast/api";
import Jimp from "jimp";
import chroma from "chroma-js";
import React, { useEffect, useState } from "react";

function createGradientUri(colors: string[], width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const scale = chroma.scale(colors).colors(width);

    const hexValues = scale.map((color) => {
      const hex = chroma(color).hex();
      return parseInt(hex.slice(1) + "FF", 16);
    });

    const matrix = [...Array(height)].map(() => hexValues);

    new Jimp(width, height, (err, image) => {
      if (err) reject(err);

      matrix.forEach((row, y) => {
        row.forEach((color, x) => {
          image.setPixelColor(color, x, y);
        });
      });

      image.getBase64(Jimp.MIME_PNG, (err, base64) => {
        if (err) reject(err);
        resolve(base64);
      });
    });
  });
}

export default function Command() {

  const [gradientOne, setGradientOne] = useState("");
  const [gradientTwo, setGradientTwo] = useState("");

  useEffect(() => {
    createGradientUri(["blue", "orange"], 259, 141).then((data) => setGradientOne(data));
    createGradientUri(["blue", "orange"], 259, 259).then((data) => setGradientTwo(data));
  }, []);

  return (
    <Grid aspectRatio="16/9">
      <Grid.Item title={"Gradient Image One"} content={gradientOne} />
      <Grid.Item title={"Gradient Image Two"} content={gradientTwo} />
    </Grid>
  );
}
