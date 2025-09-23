import { Action, ActionPanel, Clipboard, List, showHUD, showToast } from "@raycast/api";
import { useState } from "react";
import { exportImage, exportSvgImage, svgFilename, typesetBase64Svg } from "./math-server";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  function getMarkdown(asciimath: boolean, inline: boolean) {
    const svgBase64 = typesetBase64Svg(searchText, asciimath, inline);
    const markdown = `![${searchText}](${svgBase64})`;
    return markdown;
  }

  function getActions(asciimath: boolean, inline: boolean) {
    function copyImage(imageFormat: "jpg" | "png") {
      return async function () {
        await exportSvgImage(searchText, asciimath, inline);
        const file = await exportImage(searchText, asciimath, inline, imageFormat);
        await Clipboard.copy({ file });

        // Notify the user that it's completed
        showToast({ title: `${imageFormat.toUpperCase()} image copied to your clipboard`, message: file });
        showHUD(`${imageFormat.toUpperCase()} image copied to your clipboard`);
      };
    }

    // Then update them
    const actionPanel = (
      <ActionPanel title="Save Mathematics">
        <Action
          title="Copy the svg to the clipboard"
          onAction={async () => {
            exportSvgImage(searchText, asciimath, inline);
            Clipboard.copy({ file: svgFilename });

            // Notify the user that it's completed
            showToast({ title: "SVG copied to your clipboard" });
            showHUD("SVG copied to your clipboard");
          }}
        />
        <Action title="Copy a png to the clipboard" onAction={copyImage("png")} />
        <Action title="Copy a jpeg to the clipboard" onAction={copyImage("jpg")} />
        <Action.OpenInBrowser url="https://github.com/raycast/extensions/pull/1" />
      </ActionPanel>
    );
    return actionPanel;
  }

  return (
    <List
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Render Equation"
      searchBarPlaceholder="Type your equation markdown"
    >
      <List.Item
        title="AsciiMath"
        subtitle="display"
        detail={<List.Item.Detail markdown={getMarkdown(true, false)} />}
        actions={getActions(true, false)}
      />
      <List.Item
        title="Latex"
        subtitle="display"
        detail={<List.Item.Detail markdown={getMarkdown(false, false)} />}
        actions={getActions(false, false)}
      />
      <List.Item
        title="AsciiMath"
        subtitle="inline"
        detail={<List.Item.Detail markdown={getMarkdown(true, true)} />}
        actions={getActions(true, true)}
      />
      <List.Item
        title="Latex"
        subtitle="inline"
        detail={<List.Item.Detail markdown={getMarkdown(false, true)} />}
        actions={getActions(false, true)}
      />
    </List>
  );
}
