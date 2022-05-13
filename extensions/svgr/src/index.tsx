import {
  Form,
  ActionPanel,
  Action,
  Clipboard,
  LocalStorage,
  showHUD,
  showToast,
  closeMainWindow,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import Settings from "./components/Settings";
import { getReactSVG } from "./util";
import { svgrDefaultSettings } from "./constants";
import { Config } from "@svgr/core";

export interface Props {
  componentName: string;
  svg: string;
  svgo: boolean;
}

export default function Command() {
  const [svgrSettings, setSvgrSettings] = useState<Config>(svgrDefaultSettings);

  useEffect(() => {
    (async () => {
      const localSvgrSettings = await LocalStorage.getItem("svgr");
      if (localSvgrSettings && typeof localSvgrSettings === "string")
        return setSvgrSettings(JSON.parse(localSvgrSettings));
      await LocalStorage.setItem("svgr", JSON.stringify(svgrDefaultSettings));
    })();
  }, []);

  const handleCopy = async (props: Props) => {
    const reactSVG = await getReactSVG(props);
    await Clipboard.copy(reactSVG);
    await showHUD("Copied to Clipboard");
  };

  const handlePaste = async (props: Props) => {
    const reactSVG = await getReactSVG(props);
    await Clipboard.paste(reactSVG);
    await closeMainWindow();
  };

  const handleClearLocalStorage = async () => {
    await LocalStorage.removeItem("svgr");
    await showToast({ title: "Local Storage", message: "Success! Local storage cleared" });
  };

  return (
    <Form
      actions={
        <ActionPanel title="SVGR Actions">
          <Action.SubmitForm icon={Icon.Clipboard} title="Copy to Clipboard" onSubmit={handleCopy} />
          <Action.SubmitForm icon={Icon.Clipboard} title="Paste in Active App" onSubmit={handlePaste} />
          <Action.Push icon={Icon.Gear} title="Customize SVGR Settings" target={<Settings settings={svgrSettings} />} />
          <Action.SubmitForm icon={Icon.Trash} title="Restore Default Settings" onSubmit={handleClearLocalStorage} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="componentName"
        title="Component Name"
        placeholder="Name your Component"
        defaultValue="SVGComponent"
      />
      <Form.TextArea id="svg" title="SVG Code" placeholder="Paste SVG Text" />
    </Form>
  );
}
