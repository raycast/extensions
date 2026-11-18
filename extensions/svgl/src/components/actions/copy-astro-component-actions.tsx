import { Action } from "@raycast/api";
import { Svg } from "../../type";
import { generateAstroComponentAndCopy } from "../../utils/component-template";
import { useSvglExtension } from "../app-context";

const CopyAstroComponentActions = ({ svg }: { svg: Svg }) => {
  const { addRecentSvgId } = useSvglExtension();

  const handleAction = (url: string) => {
    addRecentSvgId(svg.id);
    generateAstroComponentAndCopy(url);
  };

  if (typeof svg.route === "string") {
    return (
      <>
        <Action icon="astro.svg" title="Copy Component" onAction={() => handleAction(svg.route as string)} />
      </>
    );
  }

  return (
    <>
      <Action
        icon="astro.svg"
        title="Copy Light Component"
        onAction={() => handleAction(typeof svg.route === "string" ? svg.route : svg.route.light)}
      />

      <Action
        icon="astro.svg"
        title="Copy Dark Component"
        onAction={() => handleAction(typeof svg.route === "string" ? svg.route : svg.route.dark)}
      />
    </>
  );
};

export default CopyAstroComponentActions;
