import { Action } from "@raycast/api";
import { Svg } from "../../type";
import { fetchAndCopyReactComponent } from "../../utils/fetch";
import { useSvglExtension } from "../app-context";

const CopyReactComponentActions = ({ svg }: { svg: Svg }) => {
  const { addRecentSvgId } = useSvglExtension();

  const handleAction = (url: string, name: string, tsx: boolean) => {
    addRecentSvgId(svg.id);
    fetchAndCopyReactComponent(url, name, tsx);
  };

  if (typeof svg.route === "string") {
    return (
      <>
        <Action
          icon="react-tsx.svg"
          title="Copy TSX Component"
          onAction={() => handleAction(svg.route as string, svg.title, true)}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "t" },
            Windows: { modifiers: ["ctrl"], key: "t" },
          }}
        />

        <Action
          icon="react-jsx.svg"
          title="Copy JSX Component"
          onAction={() => handleAction(svg.route as string, svg.title, false)}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "j" },
            Windows: { modifiers: ["ctrl"], key: "j" },
          }}
        />
      </>
    );
  }

  return (
    <>
      <Action
        icon="react-tsx.svg"
        title="Copy Light TSX Component"
        onAction={() => handleAction(typeof svg.route === "string" ? svg.route : svg.route.light, svg.title, true)}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "t" },
          Windows: { modifiers: ["ctrl"], key: "t" },
        }}
      />

      <Action
        icon="react-tsx.svg"
        title="Copy Dark TSX Component"
        onAction={() => handleAction(typeof svg.route === "string" ? svg.route : svg.route.dark, svg.title, true)}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "t" },
          Windows: { modifiers: ["ctrl", "shift"], key: "t" },
        }}
      />

      <Action
        icon="react-jsx.svg"
        title="Copy Light JSX Component"
        onAction={() => handleAction(typeof svg.route === "string" ? svg.route : svg.route.light, svg.title, false)}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "j" },
          Windows: { modifiers: ["ctrl"], key: "j" },
        }}
      />

      <Action
        icon="react-jsx.svg"
        title="Copy Dark JSX Component"
        onAction={() => handleAction(typeof svg.route === "string" ? svg.route : svg.route.dark, svg.title, false)}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "j" },
          Windows: { modifiers: ["ctrl", "shift"], key: "j" },
        }}
      />
    </>
  );
};

export default CopyReactComponentActions;
