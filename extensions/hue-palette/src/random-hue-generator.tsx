import { useCachedPromise } from "@raycast/utils";
import { useState, useRef } from "react";
import {
  generateHue,
  generateRandomHexColor,
  addHueGenerateRecord,
} from "./utils";
import { Hue } from "./types";
import HueDetail from "./components/hue-detail";

import { generate } from "random-words";

export default function Command() {
  const [hue, setHue] = useState<Hue | null>(null);
  const isRecordAdded = useRef(false);

  const [generatedName] = useState(
    () => generate({ minLength: 3, maxLength: 14 }) as string,
  );
  const hueColorOne = generateRandomHexColor();
  const hueColorTwo = generateRandomHexColor();

  const { isLoading } = useCachedPromise(async () => {
    const hue = (await generateHue(
      hueColorOne.replaceAll("#", ""),
      hueColorTwo.replaceAll("#", ""),
    )) as Hue;
    setHue(hue);

    if (!isRecordAdded.current) {
      await addHueGenerateRecord({
        name: generatedName,
        colors: hue.colors,
        tailwind_colors_name: generatedName.toLowerCase().replaceAll(" ", "_"),
        tailwind_colors: hue.tailwind_colors,
      } as Hue);
      isRecordAdded.current = true;
    }
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
