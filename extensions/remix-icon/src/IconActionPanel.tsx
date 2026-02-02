import { ActionPanel, Action } from "@raycast/api";
import { getSvgContent, svgToDataUri, toComponentName } from "./utils";
import metadata from "../assets/metadata.json";

export default function IconActionPanel({
  category,
  iconName,
  updateRecentIcons,
}: Readonly<{
  category: string;
  iconName: string;
  updateRecentIcons: (category: string, iconName: string) => void;
}>) {
  const componentName = toComponentName(iconName);
  const cdnLink = `<link href="https://cdn.jsdelivr.net/npm/remixicon@${metadata.version}/fonts/remixicon.css" rel="stylesheet"/>`;

  return (
    <ActionPanel>
      <Action.CopyToClipboard
        title="Copy SVG"
        content={getSvgContent(category, iconName)}
        onCopy={() => updateRecentIcons(category, iconName)}
      />
      <Action.CopyToClipboard
        title="Copy Data URI"
        content={svgToDataUri(getSvgContent(category, iconName))}
        shortcut={{ modifiers: ["cmd"], key: "u" }}
        onCopy={() => updateRecentIcons(category, iconName)}
      />
      <ActionPanel.Section title="React">
        <Action.CopyToClipboard
          title="Copy React Component"
          content={`<${componentName} size={24} color="currentColor" />`}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onCopy={() => updateRecentIcons(category, iconName)}
        />
        <Action.CopyToClipboard
          title="Copy React Import"
          content={`import { ${componentName} } from "@remixicon/react";`}
          onCopy={() => updateRecentIcons(category, iconName)}
        />
        <Action.CopyToClipboard
          // eslint-disable-next-line @raycast/prefer-title-case
          title="Copy React NPM Install"
          content={`npm install @remixicon/react`}
          onCopy={() => updateRecentIcons(category, iconName)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Vue">
        <Action.CopyToClipboard
          title="Copy Vue Component"
          content={`<${componentName} size="24px" color="currentColor" />`}
          shortcut={{ modifiers: ["cmd"], key: "v" }}
          onCopy={() => updateRecentIcons(category, iconName)}
        />
        <Action.CopyToClipboard
          title="Copy Vue Import"
          content={`import { ${componentName} } from "@remixicon/vue";`}
          onCopy={() => updateRecentIcons(category, iconName)}
        />
        <Action.CopyToClipboard
          // eslint-disable-next-line @raycast/prefer-title-case
          title="Copy Vue NPM Install"
          content={`npm install @remixicon/vue`}
          onCopy={() => updateRecentIcons(category, iconName)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Webfont">
        <Action.CopyToClipboard
          title="Copy HTML Tag"
          content={`<i class="ri-${iconName}"></i>`}
          shortcut={{ modifiers: ["cmd"], key: "h" }}
          onCopy={() => updateRecentIcons(category, iconName)}
        />
        <Action.CopyToClipboard
          title="Copy CDN Link"
          content={cdnLink}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
          onCopy={() => updateRecentIcons(category, iconName)}
        />
        <Action.CopyToClipboard
          // eslint-disable-next-line @raycast/prefer-title-case
          title="Copy Webfont NPM Install"
          content={`npm install remixicon --save`}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onCopy={() => updateRecentIcons(category, iconName)}
        />
        <Action.CopyToClipboard
          title="Copy Import Statement"
          content={"import 'remixicon/fonts/remixicon.css';"}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          onCopy={() => updateRecentIcons(category, iconName)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Links">
        <Action.OpenInBrowser title="Open Icon on Remix Icon Website" url={`https://remixicon.com/icon/${iconName}`} />
        <Action.OpenInBrowser title="Remix Icon GitHub Page" url="https://github.com/Remix-Design/RemixIcon" />
      </ActionPanel.Section>
      {/* TODO SVG Sprite */}
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
      {/* TODO - Make "your-path" a preference */}
      {/* TODO - Make size, color, className a preference */}
    </ActionPanel>
  );
}
