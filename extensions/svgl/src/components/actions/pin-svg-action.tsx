import { Action, Icon, Keyboard } from "@raycast/api";
import { useSvglExtension } from "../app-context";
import { Svg } from "../../type";

const PinSvgAction = ({ svg }: { svg: Svg }) => {
  const { pinSvg, unPinSvg, pinnedSvgIds, moveUpInPinned, moveDownInPinned, focusGridItem } = useSvglExtension();
  return pinnedSvgIds.includes(svg.id) ? (
    <>
      <Action
        icon={Icon.TackDisabled}
        title="Unpin SVG"
        onAction={() => {
          unPinSvg(svg.id, svg.title);
        }}
        shortcut={Keyboard.Shortcut.Common.Pin}
      />

      {pinnedSvgIds.indexOf(svg.id) !== 0 && (
        <Action
          icon={Icon.ArrowUp}
          title="Move up in Pinned"
          onAction={() => {
            focusGridItem(svg.id, `pinned`);
            moveUpInPinned(svg.id, svg.title);
          }}
          shortcut={Keyboard.Shortcut.Common.MoveUp}
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
          shortcut={Keyboard.Shortcut.Common.MoveDown}
        />
      )}
    </>
  ) : (
    <Action
      icon={Icon.Tack}
      title="Pin SVG"
      onAction={() => {
        pinSvg(svg.id, svg.title);
      }}
      shortcut={Keyboard.Shortcut.Common.Pin}
    />
  );
};

export default PinSvgAction;
