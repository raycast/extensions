import { useMemo, useState } from "react";
import { getColorsFromScene } from "../lib/utils";
import { createGradientPngUri } from "../lib/colors";
import { GradientCache, GradientUri, Id, Scene } from "../lib/types";
import { Cache } from "@raycast/api";

const gradientCache = new Cache({ namespace: "hue-scenes" });

export default function useSceneGradients(scenes: Scene[], width: number, height: number) {
  const [gradients, setGradients] = useState<GradientCache>(new Map<Id, GradientUri>());

  useMemo(() => {
    scenes.forEach((scene) => {
      const colors = getColorsFromScene(scene);

      if (colors.length === 0) {
        return;
      }

      // create hash from colors
      const key = colors.reduce((acc, color) => acc + color);
      const cached = gradientCache.get(key);

      if (cached) {
        setGradients((gradients) => new Map(gradients).set(scene.id, JSON.parse(cached)));
      } else {
        createGradientPngUri(colors, width, height).then((gradientUri) => {
          gradientCache.set(key, JSON.stringify(gradientUri));
          setGradients((gradients) => new Map(gradients).set(scene.id, gradientUri));
        });
      }
    });
  }, [scenes]);

  return { gradients };
}
