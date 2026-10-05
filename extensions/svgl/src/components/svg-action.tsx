import type { JSX } from "react";
import { ActionPanel, getPreferenceValues } from "@raycast/api";
import CopyReactComponentActions from "./actions/copy-react-component-actions";
import CopyVueComponentActions from "./actions/copy-vue-component-actions";
import CopySvelteComponentActions from "./actions/copy-svelte-component-actions";
import CopyAngularComponentActions from "./actions/copy-angular-component-actions";
import CopyAstroComponentActions from "./actions/copy-astro-component-actions";
import CopySvgActions from "./actions/copy-svg-actions";
import CopySvgFileActions from "./actions/copy-svg-file-actions";
import CopyWordmarkSvgActions from "./actions/copy-wordmark-svg-actions";
import CopySvgUrlActions from "./actions/copy-svg-url-actions";
import CopyWordmarkSvgUrlAction from "./actions/copy-wordmark-svg-url-actions";
import SvgInfoActions from "./actions/svg-info-actions";
import { Svg, SvgActionKey } from "../type";
import PinSvgAction from "./actions/pin-svg-action";
import CopyShadcnRegistryActions from "./actions/copy-shadcn-registry-actions";

interface SvgActionProps {
  svg: Svg;
  category: string;
}

const WORDMARK_KEYS: SvgActionKey[] = ["copySvgWordmark", "copySvgWordmarkUrl"];

const SvgAction = ({ svg, category }: SvgActionProps) => {
  const preferences = getPreferenceValues<Preferences.Index>();
  const { svgDefaultAction, showWordmark } = preferences;

  const actionSections: Record<SvgActionKey, JSX.Element | null> = {
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
    copySvgWordmark: svg.wordmark ? (
      <ActionPanel.Section title="Copy SVG Wordmark" key="copySvgWordmark">
        <CopyWordmarkSvgActions svg={svg} />
      </ActionPanel.Section>
    ) : null,
    copyShadcnRegistry: (
      <ActionPanel.Section title="Copy shadcn/ui Registry" key="copyShadcnRegistry">
        <CopyShadcnRegistryActions svg={svg} />
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
    copySvgWordmarkUrl: svg.wordmark ? (
      <ActionPanel.Section title="Copy SVG Wordmark URL" key="copySvgWordmarkUrl">
        <CopyWordmarkSvgUrlAction svg={svg} />
      </ActionPanel.Section>
    ) : null,
    copyAstroComponent: (
      <ActionPanel.Section title="Copy Astro Component" key="copyAstroComponent">
        <CopyAstroComponentActions svg={svg} />
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
  const visibleKeys = showWordmark ? orderedKeys : orderedKeys.filter((key) => !WORDMARK_KEYS.includes(key));

  const defaultAction = svgDefaultAction ?? "copySvg";
  const availableKeys = visibleKeys.filter((key) => actionSections[key] !== null);
  // When the preferred default isn't available (e.g. wordmark preference but SVG has no wordmark),
  // explicitly fall back to "copySvg" rather than relying on insertion order.
  const effectiveDefault = availableKeys.includes(defaultAction) ? defaultAction : "copySvg";
  const reorderedKeys: SvgActionKey[] = [effectiveDefault, ...availableKeys.filter((key) => key !== effectiveDefault)];

  return <ActionPanel>{reorderedKeys.map((key) => actionSections[key])}</ActionPanel>;
};

export default SvgAction;
