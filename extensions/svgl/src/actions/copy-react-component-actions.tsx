import { Action } from "@raycast/api";
import { Svg } from "../type";
import { fetchAndCopyReactComponent } from "../util";

const CopyReactComponentActions = ({ svg }: { svg: Svg }) => {
  if (typeof svg.route === "string") {
    return (
      <>
        <Action
          icon="react-tsx.svg"
          title="Copy TSX Component"
          onAction={() => fetchAndCopyReactComponent(svg.route as string, svg.title, true)}
          shortcut={{
            modifiers: ["cmd"],
            key: "t",
          }}
        />

        <Action
          icon="react-jsx.svg"
          title="Copy JSX Component"
          onAction={() => fetchAndCopyReactComponent(svg.route as string, svg.title, false)}
          shortcut={{
            modifiers: ["cmd"],
            key: "j",
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
        onAction={() =>
          fetchAndCopyReactComponent(typeof svg.route === "string" ? svg.route : svg.route.light, svg.title, true)
        }
        shortcut={{
          modifiers: ["cmd"],
          key: "t",
        }}
      />

      <Action
        icon="react-tsx.svg"
        title="Copy Dark TSX Component"
        onAction={() =>
          fetchAndCopyReactComponent(typeof svg.route === "string" ? svg.route : svg.route.dark, svg.title, true)
        }
        shortcut={{
          modifiers: ["cmd", "shift"],
          key: "t",
        }}
      />

      <Action
        icon="react-jsx.svg"
        title="Copy Light JSX Component"
        onAction={() =>
          fetchAndCopyReactComponent(typeof svg.route === "string" ? svg.route : svg.route.light, svg.title, false)
        }
        shortcut={{
          modifiers: ["cmd"],
          key: "j",
        }}
      />

      <Action
        icon="react-jsx.svg"
        title="Copy Dark JSX Component"
        onAction={() =>
          fetchAndCopyReactComponent(typeof svg.route === "string" ? svg.route : svg.route.dark, svg.title, false)
        }
        shortcut={{
          modifiers: ["cmd", "shift"],
          key: "j",
        }}
      />
    </>
  );
};

export default CopyReactComponentActions;
