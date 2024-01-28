import { Action, ActionPanel, Clipboard, Icon, showHUD } from "@raycast/api";
import * as fs from "fs";

type IconActionPanelProps = {
  /**
   * The slugified name of the icon.
   */
  name: string;

  /**
   * The stable codepoint of the icon.
   */
  codepoint: number;

  /**
   * The path to the SVG file in the extension's assets directory.
   */
  svgPath: string;

  /**
   * The URL to the icon's source file on GitHub.
   */
  githubURL: string;
};

export default function IconActionPanel(props: IconActionPanelProps) {
  const { name, codepoint, svgPath, githubURL } = props;

  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Name" content={name} />
      <Action
        title="Copy SVG Code"
        icon={Icon.CopyClipboard}
        onAction={async () => {
          const fileContent = await fs.promises.readFile(svgPath, "utf-8");
          await Clipboard.copy(fileContent);
          await showHUD("Copied to Clipboard");
        }}
      />
      <Action.CopyToClipboard
        title="Copy SVG File"
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        content={{ file: svgPath }}
      />
      <Action.CopyToClipboard
        title="Copy Codepoint"
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        content={codepoint.toString()}
      />

      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open in Browser" url={githubURL} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
