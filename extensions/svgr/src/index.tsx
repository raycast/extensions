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
import { useEffect } from "react";
import Settings from "./components/Settings";
import { getReactSVG } from "./util";
import { svgrDefaultSettings } from "./constants";

export interface Props {
  componentName: string;
  svg: string;
}

export default function Command() {
  useEffect(() => {
    (async () => {
      const localSvgrSettings = await LocalStorage.getItem("svgr");
      if (!localSvgrSettings) {
        await LocalStorage.setItem("svgr", JSON.stringify(svgrDefaultSettings));
      }
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
    await LocalStorage.setItem("svgr", JSON.stringify(svgrDefaultSettings));
    await showToast({ title: "Restore Default Settings", message: "Success! Default Settings Restored." });
  };

  return (
    <Form
      actions={
        <ActionPanel title="SVGR Actions">
          <Action.SubmitForm icon={Icon.Clipboard} title="Copy to Clipboard" onSubmit={handleCopy} />
          <Action.SubmitForm icon={Icon.Clipboard} title="Paste in Active App" onSubmit={handlePaste} />
          <Action.Push icon={Icon.Gear} title="Customize SVGR Settings" target={<Settings />} />
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
