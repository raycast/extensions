import { Action, ActionPanel, Clipboard, Icon, List, popToRoot, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { FontFileSelection } from "./components/font-file-selection";
import { generateFontFaceCss } from "./lib/fonts";

export default function Command() {
  return (
    <FontFileSelection>
      {(filePath, chooseAnotherFile) => <GenerateCss filePath={filePath} chooseAnotherFile={chooseAnotherFile} />}
    </FontFileSelection>
  );
}

function GenerateCss(props: { filePath: string; chooseAnotherFile: () => void }) {
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    async function copyCss() {
      try {
        const css = await generateFontFaceCss(props.filePath);
        if (!active) return;
        await Clipboard.copy(css);
        await showHUD("CSS copied to clipboard");
        await popToRoot();
      } catch (error) {
        if (!active) return;
        setError(error instanceof Error ? error.message : String(error));
        await showFailureToast(error, { title: "Failed to generate CSS" });
      }
    }
    void copyCss();
    return () => {
      active = false;
    };
  }, [props.filePath]);

  return (
    <List
      isLoading={!error}
      actions={
        <ActionPanel>
          <Action title="Choose Another Font" icon={Icon.Document} onAction={props.chooseAnotherFile} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.Text}
        title={error ? "Could Not Generate CSS" : "Generating CSS"}
        description={error}
      />
    </List>
  );
}
