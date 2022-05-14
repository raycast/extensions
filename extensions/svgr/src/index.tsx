import { existsSync, writeFileSync } from "fs";
import { useEffect } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  LocalStorage,
  closeMainWindow,
  confirmAlert,
  environment,
  showHUD,
  showToast,
} from "@raycast/api";
import Settings from "./components/Settings";
import { getReactSVG } from "./util";
import { svgrDefaultSettings, svgoDefaultSettings } from "./constants";

export interface Props {
  componentName: string;
  svg: string;
}

export default function Command() {
  const svgoConfigPath = `${environment.supportPath}/.svgorc.json`;

  useEffect(() => {
    (async () => {
      const localSvgrSettings = await LocalStorage.getItem("svgr");
      if (!localSvgrSettings) {
        await LocalStorage.setItem("svgr", JSON.stringify(svgrDefaultSettings));
      }
    })();
    const svgoSettings = existsSync(svgoConfigPath);
    if (!svgoSettings) writeFileSync(svgoConfigPath, JSON.stringify(svgoDefaultSettings));
  }, []);

  const handleCopy = async (props: Props) => {
    const reactSVG = await getReactSVG({ ...props, svgoConfigPath });
    await Clipboard.copy(reactSVG);
    await showHUD("Copied to Clipboard");
  };

  const handlePaste = async (props: Props) => {
    const reactSVG = await getReactSVG({ ...props, svgoConfigPath });
    await Clipboard.paste(reactSVG);
    await closeMainWindow();
  };

  const handleRestoreSvgrSettings = async () => {
    const confirmed = await confirmAlert({
      title: "Restore Default SVGR Settings?",
      message: "You cannot undo this action.",
      icon: Icon.Trash,
    });
    if (confirmed) {
      await LocalStorage.removeItem("svgr");
      await LocalStorage.setItem("svgr", JSON.stringify(svgrDefaultSettings));
      await showToast({ title: "Restore Default Settings", message: "Success!" });
    }
  };

  const handleRestoreSvgoSettings = async () => {
    const confirmed = await confirmAlert({
      title: "Restore Default SVGO Settings?",
      message: "You cannot undo this action.",
      icon: Icon.Trash,
    });
    if (confirmed) {
      writeFileSync(svgoConfigPath, JSON.stringify(svgoDefaultSettings));
      await showToast({ title: "Restore Default Settings", message: "Success!" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel title="SVGR Actions">
          <Action.SubmitForm icon={Icon.Clipboard} title="Copy to Clipboard" onSubmit={handleCopy} />
          <Action.SubmitForm icon={Icon.Clipboard} title="Paste in Active App" onSubmit={handlePaste} />
          <Action.Push icon={Icon.Gear} title="Customize SVGR Settings" target={<Settings />} />
          <Action.Open icon={Icon.Document} title="Open SVGO Settings" target={svgoConfigPath} />
          <Action.SubmitForm
            icon={Icon.TwoArrowsClockwise}
            title="Restore Default SVGR Settings"
            onSubmit={handleRestoreSvgrSettings}
          />
          <Action.SubmitForm
            icon={Icon.TwoArrowsClockwise}
            title="Restore Default SVGO Settings"
            onSubmit={handleRestoreSvgoSettings}
          />
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
