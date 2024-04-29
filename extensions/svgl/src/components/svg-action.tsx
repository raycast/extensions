import { ActionPanel } from "@raycast/api";
import CopyReactComponentActions from "./actions/copy-react-component-actions";
import CopySvgActions from "./actions/copy-svg-actions";
import CopyWordmarkSvgActions from "./actions/copy-wordmark-svg-actions";
import SvgInfoActions from "./actions/svg-info-actions";
import { Svg } from "../type";
import PinSvgAction from "./actions/pin-svg-action";

interface SvgActionProps {
  svg: Svg;
  category: string;
}

const SvgAction = ({ svg, category }: SvgActionProps) => {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Copy SVG">
        <CopySvgActions svg={svg} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy SVG Wordmark">
        <CopyWordmarkSvgActions svg={svg} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy React Component">
        <CopyReactComponentActions svg={svg} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Operation">
        <PinSvgAction svg={svg} />
      </ActionPanel.Section>
      <ActionPanel.Section title="SVG Info">
        <SvgInfoActions svg={svg} category={category} />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default SvgAction;
