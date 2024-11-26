import { Action } from "@raycast/api";
import { Svg } from "../../type";
import { generateComponentAndCopy } from "../../utils/component-template";
import { useSvglExtension } from "../app-context";

const CopySvelteComponentActions = ({ svg }: { svg: Svg }) => {
  const { addRecentSvgId } = useSvglExtension();

  const handleAction = (lang: string, url: string, framework: "Svelte") => {
    addRecentSvgId(svg.id);
    generateComponentAndCopy(lang, url, framework);
  };

  if (typeof svg.route === "string") {
    return (
      <>
        <Action
          icon="svelte.svg"
          title="Copy TS Component"
          onAction={() => handleAction("ts", svg.route as string, "Svelte")}
        />

        <Action
          icon="svelte.svg"
          title="Copy JS Component"
          onAction={() => handleAction("js", svg.route as string, "Svelte")}
        />
      </>
    );
  }

  return (
    <>
      <Action
        icon="svelte.svg"
        title="Copy Light TS Component"
        onAction={() => handleAction("ts", typeof svg.route === "string" ? svg.route : svg.route.light, "Svelte")}
        shortcut={{
          modifiers: ["cmd"],
          key: "t",
        }}
      />

      <Action
        icon="svelte.svg"
        title="Copy Dark TS Component"
        onAction={() => handleAction("ts", typeof svg.route === "string" ? svg.route : svg.route.dark, "Svelte")}
        shortcut={{
          modifiers: ["cmd", "shift"],
          key: "t",
        }}
      />

      <Action
        icon="svelte.svg"
        title="Copy Light JS Component"
        onAction={() => handleAction("ts", typeof svg.route === "string" ? svg.route : svg.route.light, "Svelte")}
        shortcut={{
          modifiers: ["cmd"],
          key: "j",
        }}
      />

      <Action
        icon="svelte.svg"
        title="Copy Dark JS Component"
        onAction={() => handleAction("js", typeof svg.route === "string" ? svg.route : svg.route.dark, "Svelte")}
        shortcut={{
          modifiers: ["cmd", "shift"],
          key: "j",
        }}
      />
    </>
  );
};

export default CopySvelteComponentActions;
