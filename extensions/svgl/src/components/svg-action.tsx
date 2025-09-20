import { ActionPanel, getPreferenceValues } from "@raycast/api";
import CopyReactComponentActions from "./actions/copy-react-component-actions";
import CopyVueComponentActions from "./actions/copy-vue-component-actions";
import CopySvelteComponentActions from "./actions/copy-svelte-component-actions";
import CopyAngularComponentActions from "./actions/copy-angular-component-actions";
import CopySvgActions from "./actions/copy-svg-actions";
import CopySvgFileActions from "./actions/copy-svg-file-actions";
import CopyWordmarkSvgActions from "./actions/copy-wordmark-svg-actions";
import CopySvgUrlActions from "./actions/copy-svg-url-actions";
import CopyWordmarkSvgUrlAction from "./actions/copy-wordmark-svg-url-actions";
import SvgInfoActions from "./actions/svg-info-actions";
import { Svg, SvgActionKey } from "../type";
import PinSvgAction from "./actions/pin-svg-action";

interface SvgActionProps {
  svg: Svg;
  category: string;
}

const SvgAction = ({ svg, category }: SvgActionProps) => {
  const preferences = getPreferenceValues<Preferences.Index>();
  const { svgDefaultAction } = preferences;

  const actionSections: Record<SvgActionKey, JSX.Element> = {
    copySvg: (
      <ActionPanel.Section title="Copy SVG" key="copySvg">
        <CopySvgActions svg={svg} />
      </ActionPanel.Section>
    ),
    copySvgFile: (
      <ActionPanel.Section title="Copy SVG File" key="copySvgFile">
        <CopySvgFileActions svg={svg} />
      </ActionPanel.Section>
    ),
    copySvgWordmark: (
      <ActionPanel.Section title="Copy SVG Wordmark" key="copySvgWordmark">
        <CopyWordmarkSvgActions svg={svg} />
      </ActionPanel.Section>
    ),
    copyReactComponent: (
      <ActionPanel.Section title="Copy React Component" key="copyReactComponent">
        <CopyReactComponentActions svg={svg} />
      </ActionPanel.Section>
    ),
    copyVueComponent: (
      <ActionPanel.Section title="Copy Vue Component" key="copyVueComponent">
        <CopyVueComponentActions svg={svg} />
      </ActionPanel.Section>
    ),
    copySvelteComponent: (
      <ActionPanel.Section title="Copy Svelte Component" key="copySvelteComponent">
        <CopySvelteComponentActions svg={svg} />
      </ActionPanel.Section>
    ),
    copyAngularComponent: (
      <ActionPanel.Section title="Copy Angular Component" key="copyAngularComponent">
        <CopyAngularComponentActions svg={svg} />
      </ActionPanel.Section>
    ),
    copySvgUrl: (
      <ActionPanel.Section title="Copy SVG URL" key="copySvgUrl">
        <CopySvgUrlActions svg={svg} />
      </ActionPanel.Section>
    ),
    copySvgWordmarkUrl: (
      <ActionPanel.Section title="Copy SVG Wordmark URL" key="copySvgWordmarkUrl">
        <CopyWordmarkSvgUrlAction svg={svg} />
      </ActionPanel.Section>
    ),
    operation: (
      <ActionPanel.Section title="Operation" key="operation">
        <PinSvgAction svg={svg} />
      </ActionPanel.Section>
    ),
    svgInfo: (
      <ActionPanel.Section title="SVG Info" key="svgInfo">
        <SvgInfoActions svg={svg} category={category} />
      </ActionPanel.Section>
    ),
  };

  const orderedKeys = Object.keys(actionSections) as SvgActionKey[];
  const reorderedKeys: SvgActionKey[] = orderedKeys.includes(svgDefaultAction ?? "copySvg")
    ? [svgDefaultAction ?? "copySvg", ...orderedKeys.filter((key) => key !== svgDefaultAction)]
    : orderedKeys;

  return <ActionPanel>{reorderedKeys.map((key) => actionSections[key])}</ActionPanel>;
};

export default SvgAction;
