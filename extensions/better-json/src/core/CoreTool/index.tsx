import { useEffect, useState } from "react";
import { Clipboard, Icon, List } from "@raycast/api";
import { initialInput } from "../document";
import { readDraft } from "../draft";
import InputForm from "./InputForm";
import JsonBrowser from "./JsonBrowser";
import { WorkspaceNavigation } from "../workspaceNavigation";

export default function CoreTool({ nativeDraft }: { nativeDraft?: string }) {
  const [screen, setScreen] = useState<ReturnType<typeof initialInput>>();
  const [navigation] = useState(
    () =>
      new WorkspaceNavigation((document) => {
        setScreen({ kind: "browser", document });
      }),
  );

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const draft = nativeDraft?.trim() ? nativeDraft : await readDraft();
        // The clipboard must never overwrite unfinished work.
        const clipboard = draft?.trim() ? undefined : await Clipboard.readText();
        if (active) setScreen(initialInput(draft, clipboard));
      } catch {
        if (active)
          setScreen({
            kind: "editor",
            source: "",
            inputSource: "Manual Input",
            error: "Could not load your draft or clipboard. Paste JSON to continue, or try Read Clipboard again.",
          });
      }
    }
    void start();
    return () => {
      active = false;
    };
  }, [nativeDraft]);

  if (!screen)
    return (
      <List isLoading>
        <List.EmptyView icon={Icon.Document} title="Opening JSON…" />
      </List>
    );
  if (screen.kind === "editor")
    return (
      <InputForm
        initialSource={screen.source}
        inputSource={screen.inputSource}
        initialError={screen.error}
        onAccept={navigation.replace}
      />
    );
  return <JsonBrowser document={screen.document} navigation={navigation} />;
}
