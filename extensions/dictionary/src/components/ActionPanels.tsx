import os from "os";

import { Action, ActionPanel, Icon } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { DefItem } from "../types";
import NestedList from "../views/NestedList";

const TTSSection = ({ ttsTitles }: { ttsTitles: [string, string?] }) => {
  const { revalidate: transTTS } = useExec("afplay", [`${os.tmpdir()}/raycast-dictionary-trans.mp3`], {
    execute: false,
  });
  const { revalidate: srcTTS } = useExec("afplay", [`${os.tmpdir()}/raycast-dictionary-source.mp3`], {
    execute: false,
  });
  return (
    <ActionPanel.Section title="TTS">
      {ttsTitles[0] && (
        <Action
          title={`Speak '${ttsTitles[0]}'`}
          onAction={() => transTTS()}
          shortcut={{ modifiers: ["shift"], key: "enter" }}
        />
      )}
      {ttsTitles[1] && (
        <Action
          title={`Speak '${ttsTitles[1]}'`}
          onAction={() => srcTTS()}
          shortcut={{ modifiers: ["shift", "opt"], key: "enter" }}
        />
      )}
    </ActionPanel.Section>
  );
};

export const DefActionPanel = (props: { defItem: DefItem; onAction?: (nestedView: string) => void }) => {
  const {
    defItem: { metaData = {}, title },
  } = props;
  const { toClipboard = [], url, supportTTS = [], nestedView } = metaData;

  return (
    <ActionPanel>
      {nestedView && (
        <Action.Push
          icon={Icon.AppWindowSidebarLeft}
          title="View Result"
          target={
            <NestedList
              defItem={props.defItem}
              isShowingDetail={nestedView.type === "listDetail"}
              engine="urbandefine"
            />
          }
        />
      )}

      <ActionPanel.Section>
        <Action.CopyToClipboard title={`Copy '${toClipboard[0] || title}'`} content={toClipboard[0] || title} />
        {url && <Action.OpenInBrowser url={url} shortcut={{ modifiers: ["cmd"], key: "return" }} />}
        {toClipboard[1] && (
          <Action.CopyToClipboard
            title={`Copy '${toClipboard[1]}'`}
            content={toClipboard[1]}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        )}
      </ActionPanel.Section>
      {(supportTTS.length && <TTSSection ttsTitles={[toClipboard[0] || title, supportTTS[1] && toClipboard[1]]} />) ||
        null}
    </ActionPanel>
  );
};

export default DefActionPanel;
