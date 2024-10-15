import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { generateHue, generateRandomHexColor } from "./utils";
import { Hue } from "./types";
import HueDetail from "./hue-detail";

import { generate } from "random-words";

export default function Command() {
  const [hue, setHue] = useState<Hue | null>(null);

  const generatedName = generate({ minLength: 3, maxLength: 14 }) as string;
  const hueColorOne = generateRandomHexColor();
  const hueColorTwo = generateRandomHexColor();

  const { isLoading } = useCachedPromise(async () => {
    const hue = await generateHue(
      hueColorOne.replaceAll("#", ""),
      hueColorTwo.replaceAll("#", ""),
    );
    setHue(hue as Hue);
  });

  return (
    <HueDetail
      isLoading={isLoading}
      isGenerator={true}
      name={generatedName}
      tailwind_colors_name={
        generatedName.toLowerCase().replaceAll(" ", "_") ?? ""
      }
      tailwind_colors={hue?.tailwind_colors ?? {}}
    />
  );
}
