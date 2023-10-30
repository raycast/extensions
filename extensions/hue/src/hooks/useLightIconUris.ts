import { useMemo, useState } from "react";
import { Id, Light, PngUriLightIconSet } from "../lib/types";
import { Cache } from "@raycast/api";
import { createLightOffIconPngUri, createLightOnIconPngUri } from "../helpers/createLightIconPngUri";
import { getColorFromLight, getIconPathFromLight } from "../helpers/hueResources";

const lightSquareCache = new Cache({ namespace: "hue-light-icons" });

export default function useLightIconUris(lights: Light[], width: number, height: number) {
  const [lightIconPngUriSets, setLightIconPngUriSets] = useState<Map<Id, PngUriLightIconSet> | null>(null);

  useMemo(() => {
    lights.forEach((light) => {
      const lightIconPath = getIconPathFromLight(light);
      const lightColor = getColorFromLight(light);
      const onKey = `${lightIconPath}_${lightColor}_${width}x${height}`;
      const offLightKey = `${lightIconPath}_off_light_${width}x${height}`;
      const offDarkKey = `${lightIconPath}_off_dark_${width}x${height}`;

      const cachedOnIcon = lightSquareCache.get(onKey);
      const cachedOffLightIcon = lightSquareCache.get(offLightKey);
      const cachedOffDarkIcon = lightSquareCache.get(offDarkKey);

      Promise.all([
        cachedOnIcon ? JSON.parse(cachedOnIcon) : createLightOnIconPngUri(lightIconPath, lightColor, width, height),
        cachedOffLightIcon
          ? JSON.parse(cachedOffLightIcon)
          : createLightOffIconPngUri(lightIconPath, "light", width, height),
        cachedOffDarkIcon
          ? JSON.parse(cachedOffDarkIcon)
          : createLightOffIconPngUri(lightIconPath, "dark", width, height),
      ]).then(([onIcon, offLightIcon, offDarkIcon]) => {
        lightSquareCache.set(onKey, JSON.stringify(onIcon));
        lightSquareCache.set(offLightKey, JSON.stringify(offLightIcon));
        lightSquareCache.set(offDarkKey, JSON.stringify(offDarkIcon));
        setLightIconPngUriSets((lightIcons) =>
          new Map(lightIcons).set(light.id, {
            on: onIcon,
            offLight: offLightIcon,
            offDark: offDarkIcon,
          }),
        );
      });
    });
  }, [lights]);

  return { lightIconPngUriSets };
}
