import { ActionPanel } from "@raycast/api";
import CopyReactComponentActions from "./actions/copy-react-component-actions";
import CopyVueComponentActions from "./actions/copy-vue-component-actions";
import CopySvelteComponentActions from "./actions/copy-svelte-component-actions";
import CopyAngularComponentActions from "./actions/copy-angular-component-actions";
import CopySvgActions from "./actions/copy-svg-actions";
import CopyWordmarkSvgActions from "./actions/copy-wordmark-svg-actions";
import CopySvgUrlActions from "./actions/copy-svg-url-actions";
import CopyWordmarkSvgUrlAction from "./actions/copy-wordmark-svg-url-actions";
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
      <ActionPanel.Section title="Copy Vue Component">
        <CopyVueComponentActions svg={svg} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy Svelte Component">
        <CopySvelteComponentActions svg={svg} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy Angular Component">
        <CopyAngularComponentActions svg={svg} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy SVG URL">
        <CopySvgUrlActions svg={svg} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy SVG Wordmark URL">
        <CopyWordmarkSvgUrlAction svg={svg} />
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
