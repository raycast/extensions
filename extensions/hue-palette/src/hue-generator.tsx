import { LaunchProps, Toast, showToast, popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { generateHue } from "./utils";
import { Hue } from "./types";
import HueDetail from "./hue-detail";

export default function Command({
  arguments: { hueName, hueColorOne, hueColorTwo },
}: LaunchProps<{
  arguments: { hueName: string; hueColorOne: string; hueColorTwo: string };
}>) {
  const [hue, setHue] = useState<Hue | null>(null);

  const pattern = new RegExp("[a-zA-Z0-9 ]");
  const isValidHexColor = (color: string) => /^[0-9A-F]{6}$/i.test(color);

  hueColorOne = hueColorOne.toLowerCase().replaceAll("#", "");
  hueColorTwo = hueColorTwo.toLowerCase().replaceAll("#", "");

  if (hueColorOne.length === 3) {
    hueColorOne = `${hueColorOne[0]}${hueColorOne[0]}${hueColorOne[1]}${hueColorOne[1]}${hueColorOne[2]}${hueColorOne[2]}`;
  }

  if (hueColorTwo.length === 3) {
    hueColorTwo = `${hueColorTwo[0]}${hueColorTwo[0]}${hueColorTwo[1]}${hueColorTwo[1]}${hueColorTwo[2]}${hueColorTwo[2]}`;
  }

  useEffect(() => {
    const validateInputs = async () => {
      if (!pattern.test(hueName) || hueName.length > 14) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Hue Name",
          message:
            "The hue name's maximum length is 14 characters, and it can only contain letters, numbers, and spaces.",
        });
        popToRoot({ clearSearchBar: true });
        return false;
      }

      if (
        !hueColorOne ||
        !hueColorTwo ||
        !isValidHexColor(hueColorOne) ||
        !isValidHexColor(hueColorTwo)
      ) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Hex Color",
          message: "Please provide two valid hex colors.",
        });
        popToRoot({ clearSearchBar: true });
        return false;
      }

      return true;
    };

    validateInputs();
  }, [hueName, hueColorOne, hueColorTwo]);

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
      name={hueName}
      tailwind_colors_name={hueName.toLowerCase().replaceAll(" ", "_") ?? ""}
      tailwind_colors={hue?.tailwind_colors ?? {}}
    />
  );
}
