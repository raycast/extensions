import { useMemo, useState } from "react";
import { createGradientPngUri } from "../lib/createGradientUri";
import { GradientUri, GradientUriCache, Id, Palette } from "../lib/types";
import { Cache } from "@raycast/api";
import chroma from "chroma-js";

const gradientCache = new Cache({ namespace: "hue-scene-gradients" });

export default function useGradientUris(idsToPalettes: Map<Id, Palette>, width: number, height: number) {
  const [gradientUris, setGradientUris] = useState<GradientUriCache>(new Map<Id, GradientUri>());

  useMemo(() => {
    idsToPalettes.forEach((palette, id) => {
      if (palette.length === 0) {
        return;
      }

      palette.sort((a, b) => chroma(a).get("hsl.h") - chroma(b).get("hsl.h"));

      const key = `${width}x${height}_${palette.join("_")}`;
      const cached = gradientCache.get(key);

      if (cached) {
        setGradientUris((gradients) => new Map(gradients).set(id, JSON.parse(cached)));
      } else {
        createGradientPngUri(palette, width, height).then((gradientUri) => {
          gradientCache.set(key, JSON.stringify(gradientUri));
          setGradientUris((gradients) => new Map(gradients).set(id, gradientUri));
        });
      }
    });
  }, [idsToPalettes]);

  return { gradientUris: gradientUris };
}
