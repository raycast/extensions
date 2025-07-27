import { useCachedState } from "@raycast/utils";
import { useContext, useEffect } from "react";
import { Context } from "u/context";

type RatioType = "3/2" | "1" | "16/9" | "2/3" | "4/3" | "3/4" | "9/16" | undefined;

export default function getViewMode() {
  const [ratio, setRatio] = useCachedState<RatioType>("current-ratio", "16/9");
  const { viewMode } = useContext(Context);

  useEffect(() => {
    switch (viewMode) {
      case "normal":
        setRatio("4/3");
        break;
      case "comfortable":
        setRatio("1");
        break;
      case "compact":
        setRatio("16/9");
        break;
      default:
        setRatio("16/9");
    }
  }, [viewMode]); // Add viewMode as a dependency

  return ratio;
}
