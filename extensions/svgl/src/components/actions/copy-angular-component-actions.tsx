import { Action } from "@raycast/api";
import { Svg } from "../../type";
import { generateAngularComponentAndCopy } from "../../utils/component-template";
import { useSvglExtension } from "../app-context";

const CopyAngularComponentActions = ({ svg }: { svg: Svg }) => {
  const { addRecentSvgId } = useSvglExtension();

  const handleAction = (url: string, componentName: string) => {
    console.log("Copy Angular Component", url, componentName);
    addRecentSvgId(svg.id);
    generateAngularComponentAndCopy(url, componentName.replace(" ", ""));
  };

  if (typeof svg.route === "string") {
    return (
      <>
        <Action
          icon="angular.png"
          title="Copy Component"
          onAction={() => handleAction(svg.route as string, svg.title)}
        />
      </>
    );
  }

  return (
    <>
      <Action
        icon="angular.png"
        title="Copy Light Component"
        onAction={() => handleAction(typeof svg.route === "string" ? svg.route : svg.route.light, svg.title)}
      />

      <Action
        icon="angular.png"
        title="Copy Dark Component"
        onAction={() => handleAction(typeof svg.route === "string" ? svg.route : svg.route.dark, svg.title)}
      />
    </>
  );
};

export default CopyAngularComponentActions;
