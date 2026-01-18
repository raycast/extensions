import { ActionPanel, Action, Icon, Clipboard, showHUD } from "@raycast/api";
import { readAssetFile } from "./utils";
import { RemixIcon } from "./types";

export default function IconActionPanel({
  icon,
  updateRecentIcons,
}: Readonly<{
  icon: RemixIcon;
  updateRecentIcons: (icon: RemixIcon) => void;
}>) {
  const copySVG = () => {
    try {
      const content = readAssetFile(icon.path);
      Clipboard.copy(content);
      showHUD(`📋 Copied "${icon.name}" (SVG) to your clipboard.`);
      updateRecentIcons(icon);
    } catch (error) {
      console.error(error);
      showHUD("❌ Could not copy the icon.");
    }
  };

  const copyWebfont = () => {
    const content = `<i class="${icon.name}"></i>`;
    Clipboard.copy(content);
    showHUD(`📋 Copied "${icon.name}" (Webfont) to your clipboard.`);
    updateRecentIcons(icon);
  };

  const copyDataURI = () => {
    try {
      const content = readAssetFile(icon.path);
      const dataUri = `data:image/svg+xml;base64,${Buffer.from(content).toString("base64")}`;
      Clipboard.copy(dataUri);
      showHUD(`📋 Copied "${icon.name}" (Data URI) to your clipboard.`);
      updateRecentIcons(icon);
    } catch (error) {
      console.error(error);
      showHUD("❌ Could not copy the Data URI.");
    }
  };

  return (
    <ActionPanel>
      <Action title="Copy SVG" onAction={copySVG} icon={Icon.CopyClipboard} />
      <Action
        title="Copy Webfont"
        onAction={copyWebfont}
        icon={Icon.CopyClipboard}
      />
      <Action
        title="Copy Data URI"
        onAction={copyDataURI}
        icon={Icon.CopyClipboard}
      />
      <Action.OpenInBrowser
        title="Remix Icon Homepage"
        url="https://remixicon.com/"
      />
      <Action.OpenInBrowser
        title="Remix Icon GitHub Page"
        url="https://github.com/Remix-Design/RemixIcon"
      />
      {/* TODO - Make "your-path" a preference */}
      {/* <Action
        title="Copy SVG Sprite"
        onAction={() => {
          try {
            const spriteElement = `<svg class="remix"><use xlink:href="your-path/remixicon.symbol.svg#${icon.name}"></use></svg>`;
            Clipboard.copy(spriteElement);
            showHUD(`📋 Copied "${icon.name}" (SVG Sprite) to your clipboard.`);
            updateRecentIcons(icon);
          } catch (error) {
            showHUD("❌ Could not copy the SVG Sprite.");
          }
        }}
        icon={Icon.Link}
      /> */}

      {/* TODO - Make size, color, className a preference */}
      {/* <Action
        title="Copy React Component"
        onAction={() => {
          const componentName = toUpperCamelCase(icon.name);
          const component = `<${componentName} size={24} color="black" className="my-class"/>`;
          Clipboard.copy(component);
          showHUD(
            `📋 Copied "${icon.name}" (React Component) to your clipboard.`,
          );
        }}
        icon={Icon.Code}
      /> */}
    </ActionPanel>
  );
}
