import { useMemo, useState } from "react";
import { Id, Light, PngUriLightIconSet } from "../lib/types";
import { Cache } from "@raycast/api";
import { createLightOffIconPngUri, createLightOnIconPngUri } from "../helpers/createLightIconPngUri";
import { getColorFromLight, getIconPathFromLight } from "../helpers/hueResources";

const lightSquareCache = new Cache({ namespace: "hue-light-icons" });

export default function useLightIconUris(lights: Light[], width: number, height: number) {
  const [lightIconPngUriSets, setLightIconPngUriSets] = useState(new Map<Id, PngUriLightIconSet>());

  useMemo(() => {
    lights.forEach((light) => {
      const lightIconPath = getIconPathFromLight(light);
      const lightColor = getColorFromLight(light);
      const onKey = `${lightIconPath}_${lightColor}_${width}x${height}`;
      const offLightKey = `${lightIconPath}_off_light_${width}x${height}`;
      const offDarkKey = `${lightIconPath}_off_dark_${width}x${height}`;

      Promise.all([
        lightSquareCache.get(onKey) ?? createLightOnIconPngUri(lightIconPath, lightColor, width, height),
        lightSquareCache.get(offLightKey) ?? createLightOffIconPngUri(lightIconPath, "light", width, height),
        lightSquareCache.get(offDarkKey) ?? createLightOffIconPngUri(lightIconPath, "dark", width, height),
      ]).then(([onIcon, offLightIcon, offDarkIcon]) => {
        lightSquareCache.set(onKey, JSON.stringify(onIcon));
        lightSquareCache.set(offLightKey, JSON.stringify(offLightIcon));
        lightSquareCache.set(offDarkKey, JSON.stringify(offDarkIcon));
        setLightIconPngUriSets((lightIcons) =>
          new Map(lightIcons).set(light.id, {
            on: onIcon,
            offLight: offLightIcon,
            offDark: offDarkIcon,
          })
        );
      });
    });
  }, [lights]);

  return { lightIconPngUriSets };
}
