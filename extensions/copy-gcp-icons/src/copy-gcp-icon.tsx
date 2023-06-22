import {
  ActionPanel,
  environment,
  getPreferenceValues,
  List,
  popToRoot,
  showHUD,
  showToast,
  ToastStyle,
} from "@raycast/api";
import download from "download";
import { existsSync, mkdirSync, readdirSync } from "fs";
import { resolve } from "path";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";

const ZIP_URL = "https://cloud.google.com/icons/files/google-cloud-icons.zip";
const ICON_DIR = resolve(environment.supportPath, "icons");

export default function IconList() {
  const [iconDirs, setIconDirs] = useState<string[]>([]);

  useEffect(() => {
    async function loadIcons() {
      if (!existsSync(ICON_DIR)) {
        mkdirSync(ICON_DIR, { recursive: true });
      }

      let dirs = readdirSync(ICON_DIR);
      if (dirs.length == 0) {
        const toast = await showToast(ToastStyle.Animated, "Fetching GCP Icons...");
        await download(ZIP_URL, ICON_DIR, { extract: true });
        toast.hide();
        dirs = readdirSync(ICON_DIR);
      }

      setIconDirs(dirs);
    }
    loadIcons();
  }, []);

  const title = (dirname: string) =>
    dirname
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  return (
    <List>
      {iconDirs.map((dirname) => (
        <IconItem
          key={dirname}
          title={title(dirname)}
          pngPath={resolve(ICON_DIR, dirname, `${dirname}.png`)}
          svgPath={resolve(ICON_DIR, dirname, `${dirname}.svg`)}
        />
      ))}
    </List>
  );
}

const { primaryAction } = getPreferenceValues();
function IconItem(props: { title: string; pngPath: string; svgPath: string }) {
  const { title, pngPath, svgPath } = props;

  const copyPngAction = (
    <CopyFileToClipboardAction
      key="copyPng"
      path={pngPath}
      title={`Copy PNG Icon`}
      message="PNG icon copied to clipboard!"
    />
  );
  const copySvgAction = (
    <CopyFileToClipboardAction
      key="copySvg"
      path={svgPath}
      title={`Copy SVG Icon`}
      message="SVG icon copied to clipboard!"
    />
  );

  const actions = primaryAction == "copyPng" ? [copyPngAction, copySvgAction] : [copySvgAction, copyPngAction];
  return <List.Item title={title} icon={pngPath} actions={<ActionPanel>{actions}</ActionPanel>} />;
}

function CopyFileToClipboardAction(props: { path: string; title: string; message: string }) {
  const applescript_cmd = `set the clipboard to POSIX file "${props.path}"`;

  return (
    <ActionPanel.Item
      title={props.title}
      onAction={async () => {
        await runAppleScript(applescript_cmd);
        await showHUD(props.message);
        await popToRoot();
      }}
    />
  );
}
