import { useMemo, useState } from "react";
import { Id, Light, PngUri, PngUriCache } from "../lib/types";
import { Cache } from "@raycast/api";
import { createLightIconPngUri } from "../helpers/createLightIconPngUri";
import { getColorFromLight, getIconPathFromLight } from "../helpers/hueResources";

const lightSquareCache = new Cache({ namespace: "hue-scene-gradients" });

export default function useLightIconUris(lights: Light[], width: number, height: number) {
  const [lightIconUris, setLightIconUris] = useState<PngUriCache>(new Map<Id, PngUri>());

  useMemo(() => {
    lights.forEach((light) => {
      const lightIconPath = getIconPathFromLight(light);
      const lightColor = getColorFromLight(light);
      const key = `${lightIconPath}_${lightColor}_${width}x${height}`;
      const cached = lightSquareCache.get(key);

      if (cached) {
        setLightIconUris((gradients) => new Map(gradients).set(light.id, JSON.parse(cached)));
      } else {
        createLightIconPngUri(lightIconPath, lightColor, width, height).then((lightIconUri) => {
          lightSquareCache.set(key, JSON.stringify(lightIconUri));
          setLightIconUris((gradients) => new Map(gradients).set(light.id, lightIconUri));
        });
      }
    });
  }, [lights]);

  return { lightIconUris };
}
