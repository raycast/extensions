import { useState } from "react";
import { List, Icon, ActionPanel, Action, Keyboard, showToast, Toast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

import { ErrInfo } from "@type";
import ResultAction from "@view/result/ui/ResultAction";
import { Formatter, ResultManager } from "@view/result";

interface ListItemProps {
  text: string;
  errInfo: ErrInfo;
  resultManager: ResultManager;
}

export default function ListItem({ text, errInfo, resultManager }: ListItemProps) {
  const formatter = new Formatter(text);
  const [markdown, setMarkdown] = useState(formatter.formatText(text, errInfo));

  async function setNewWord(errorIdx: number, newWord: string) {
    setMarkdown(formatter.formatText(text, errInfo, newWord));

    resultManager.updateWordList(errorIdx, newWord);

    const toastMessage = newWord === errInfo.orgStr ? "Word Unselected" : "New Word Selected";

    await showToast({
      style: Toast.Style.Success,
      title: toastMessage,
      message: `${errInfo.orgStr} -> ${newWord}`,
    });
  }

  return (
    <List.Item
      title={errInfo.orgStr}
      icon={{
        source: Icon.Warning,
        tintColor: {
          light: "#171717",
          dark: "#eeeeee",
          adjustContrast: true,
        },
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Submenu icon={Icon.Pencil} title={`Edit ${errInfo.orgStr}`}>
            {errInfo.candWords.map((word, idx) => (
              <Action
                key={word}
                title={`Select ${word}`}
                onAction={async () => setNewWord(errInfo.errorIdx, word)}
                shortcut={{ modifiers: ["ctrl"], key: (idx + 1).toString() as Keyboard.KeyEquivalent }}
              />
            ))}
            <Action
              title={`Select ${errInfo.orgStr}`}
              onAction={async () => setNewWord(errInfo.errorIdx, errInfo.orgStr)}
              shortcut={{ modifiers: ["ctrl"], key: "0" }}
            />
          </ActionPanel.Submenu>
          <ActionPanel.Section>
            <ResultAction title="Copy Corrected Text" actionType={"COPY"} resultManager={resultManager} />
            <Action.CopyToClipboard
              title="Copy Original Text"
              content={resultManager.text}
              shortcut={{ modifiers: ["shift"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <ResultAction
              title="Open in Twitter"
              actionType={"TWITTER"}
              resultManager={resultManager}
              url={"https://twitter.com/intent/tweet?text="}
            />
            <Action.OpenInBrowser
              title="Open Original Website"
              icon={getFavicon("http://speller.cs.pusan.ac.kr/")}
              url={"http://speller.cs.pusan.ac.kr/"}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      detail={<List.Item.Detail markdown={markdown}></List.Item.Detail>}
    />
  );
}
