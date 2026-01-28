import { Action, Icon } from "@raycast/api";
import { useSvglExtension } from "../app-context";
import { Svg } from "../../type";

const PinSvgAction = ({ svg }: { svg: Svg }) => {
  const { pinSvg, unPinSvg, pinnedSvgIds, moveUpInPinned, moveDownInPinned, focusGridItem } = useSvglExtension();
  return pinnedSvgIds.includes(svg.id) ? (
    <>
      <Action
        icon={Icon.TackDisabled}
        title="Unpin Svg"
        onAction={() => {
          unPinSvg(svg.id, svg.title);
        }}
        shortcut={{
          modifiers: ["cmd", "shift"],
          key: "p",
        }}
      />

      {pinnedSvgIds.indexOf(svg.id) !== 0 && (
        <Action
          icon={Icon.ArrowUp}
          title="Move Up in Pinned"
          onAction={() => {
            focusGridItem(svg.id, `pinned`);
            moveUpInPinned(svg.id, svg.title);
          }}
          shortcut={{
            modifiers: ["cmd", "opt"],
            key: "arrowUp",
          }}
        />
      )}

      {pinnedSvgIds.indexOf(svg.id) !== pinnedSvgIds.length - 1 && (
        <Action
          icon={Icon.ArrowDown}
          title="Move Down in Pinned"
          onAction={() => {
            focusGridItem(svg.id, `pinned`);
            moveDownInPinned(svg.id, svg.title);
          }}
          shortcut={{
            modifiers: ["cmd", "opt"],
            key: "arrowDown",
          }}
        />
      )}
    </>
  ) : (
    <Action
      icon={Icon.Tack}
      title="Pin Svg"
      onAction={() => {
        pinSvg(svg.id, svg.title);
      }}
      shortcut={{
        modifiers: ["cmd", "shift"],
        key: "p",
      }}
    />
  );
};

export default PinSvgAction;
