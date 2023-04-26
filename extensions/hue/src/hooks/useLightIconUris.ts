import { useMemo, useState } from "react";
import { Id, Light, PngUri, PngUriCache } from "../lib/types";
import { Cache, environment } from "@raycast/api";
import { createLightOffIconPngUri, createLightIconPngUri } from "../helpers/createLightIconPngUri";
import { getColorFromLight, getIconPathFromLight } from "../helpers/hueResources";

const lightSquareCache = new Cache({ namespace: "hue-scene-gradients" });

export default function useLightIconUris(lights: Light[], width: number, height: number) {
  const [lightIconUris, setLightIconUris] = useState<PngUriCache>(new Map<Id, PngUri>());

  useMemo(() => {
    lights.forEach((light) => {
      const lightIconPath = getIconPathFromLight(light);
      const lightColor = getColorFromLight(light);
      const key = light.on.on
        ? `${lightIconPath}_${lightColor}_${width}x${height}`
        : `${lightIconPath}_off_${environment.theme}_${width}x${height}`;
      const cached = lightSquareCache.get(key) && false;

      if (cached) {
        setLightIconUris((gradients) => new Map(gradients).set(light.id, JSON.parse(cached)));
      } else {
        if (light.on.on) {
          createLightIconPngUri(lightIconPath, lightColor, width, height).then((lightIconUri) => {
            lightSquareCache.set(key, JSON.stringify(lightIconUri));
            setLightIconUris((gradients) => new Map(gradients).set(light.id, lightIconUri));
          });
        } else {
          createLightOffIconPngUri(lightIconPath, environment.theme, width, height).then((lightIconUri) => {
            lightSquareCache.set(key, JSON.stringify(lightIconUri));
            setLightIconUris((gradients) => new Map(gradients).set(light.id, lightIconUri));
          });
        }
      }
    });
  }, [lights]);

  return { lightIconUris };
}
