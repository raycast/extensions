import { writeFileSync } from "fs";
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
import getReactSVG from "./functions/getReactSvg";
import { SVGR_DEFAULT, SVGO_DEFAULT } from "./constants";
import useInitSettings from "./hooks/useInitSettings";

export interface SvgrProps {
  componentName: string;
  svg: string;
}

export default function Command() {
  const svgoConfigPath = `${environment.supportPath}/.svgorc.json`;

  useInitSettings({ svgoConfigPath });

  const handleCopy = async (props: SvgrProps) => {
    const reactSVG = await getReactSVG({ ...props, svgoConfigPath });
    if (reactSVG) {
      await Clipboard.copy(reactSVG);
      await showHUD("Copied to Clipboard");
    }
  };

  const handlePaste = async (props: SvgrProps) => {
    const reactSVG = await getReactSVG({ ...props, svgoConfigPath });
    if (reactSVG) {
      await Clipboard.paste(reactSVG);
      await closeMainWindow();
    }
  };

  const handleRestoreSvgoSettings = async () => {
    const confirmed = await confirmAlert({
      title: "Restore Default SVGO Settings?",
      message: "You cannot undo this action.",
      icon: Icon.Trash,
    });
    if (confirmed) {
      writeFileSync(svgoConfigPath, JSON.stringify(SVGO_DEFAULT));
      await showToast({ title: "Restore Default SVGO Settings", message: "Success!" });
    }
  };

  const handleRestoreSvgrSettings = async () => {
    const confirmed = await confirmAlert({
      title: "Restore Default SVGR Settings?",
      message: "You cannot undo this action.",
      icon: Icon.Trash,
    });
    if (confirmed) {
      await LocalStorage.removeItem("svgr");
      await LocalStorage.setItem("svgr", JSON.stringify(SVGR_DEFAULT));
      await showToast({ title: "Restore Default SVGR Settings", message: "Success!" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel title="SVGR Actions">
          <Action.SubmitForm icon={Icon.Clipboard} onSubmit={handleCopy} title="Copy to Clipboard" />
          <Action.SubmitForm icon={Icon.Clipboard} onSubmit={handlePaste} title="Paste in Active App" />
          <Action.Push icon={Icon.Gear} title="Customize SVGR Settings" target={<Settings />} />
          <Action.Open icon={Icon.Document} title="Open SVGO Settings" target={svgoConfigPath} />
          <Action.SubmitForm
            icon={Icon.TwoArrowsClockwise}
            onSubmit={handleRestoreSvgrSettings}
            title="Restore Default SVGR Settings"
          />
          <Action.SubmitForm
            icon={Icon.TwoArrowsClockwise}
            onSubmit={handleRestoreSvgoSettings}
            title="Restore Default SVGO Settings"
          />
        </ActionPanel>
      }
    >
      <Form.TextField defaultValue="SVGComponent" id="componentName" title="Component Name" />
      <Form.TextArea id="svg" placeholder="Paste SVG Text" title="SVG Code" />
    </Form>
  );
}
