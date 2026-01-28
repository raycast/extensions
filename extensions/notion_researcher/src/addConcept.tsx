import {
  List,
  Clipboard,
  ActionPanel,
  Action,
  showToast,
  Toast,
  closeMainWindow,
  PopToRootType,
  Icon,
  Color,
  popToRoot,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { createConceptNotionPage } from "./notion/addConceptToPage";
import { useCachedPromise } from "@raycast/utils";
import { queryDatabase } from "./notion/queryDatabase";

export function useQueryDatabase(query: string) {
  const res = useCachedPromise((query) => queryDatabase(query), [query], {
    keepPreviousData: true,
  });
  return res;
}

export default function Command() {
  const [titleText, setTitleText] = useState<string>("");
  const [clipboardText, setClipboardText] = useState<string | null>(null);
  const { data: searchPages } = useQueryDatabase(titleText);

  useEffect(() => {
    async function readClipboard() {
      const { text } = await Clipboard.read();
      setClipboardText(text);
    }

    readClipboard();
  }, []);

  async function onAction() {
    if (clipboardText && titleText !== "") {
      await closeMainWindow({ clearRootSearch: false, popToRootType: PopToRootType.Suspended });

      setTimeout(() => {
        popToRoot({ clearSearchBar: true });
      }, 2500);

      await showToast({
        style: Toast.Style.Animated,
        title: `Adding concept ${titleText} to Notion`,
      });
      await createConceptNotionPage(titleText, clipboardText);
      await showToast({
        style: Toast.Style.Success,
        title: `Concept Added!`,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: getMessage(),
      });
    }
  }
  const getMessage = () => {
    if (!clipboardText && !titleText) {
      return "Clipboard and concept name are both empty.";
    }
    if (!clipboardText) {
      return "Clipboard is empty.";
    }
    if (!titleText) {
      return "No concept name yet...";
    }
    return "Ready";
  };

  return (
    <List isShowingDetail searchBarPlaceholder="Concept name" onSearchTextChange={setTitleText}>
      {searchPages?.map((p) => (
        <List.Item
          key={p.id}
          icon={p.icon}
          title={p.title}
          actions={
            <ActionPanel>
              <Action title="Add Concept" onAction={onAction} />
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={clipboardText} />}
        />
      ))}
      <List.Item
        icon={Icon.Plus}
        title={titleText}
        actions={
          <ActionPanel>
            <Action title="Add Concept" onAction={onAction} />
          </ActionPanel>
        }
        detail={<List.Item.Detail markdown={clipboardText} />}
        accessories={[
          {
            tag: {
              value: getMessage(),
              color: clipboardText && titleText ? Color.Green : Color.Red,
            },
            icon: clipboardText && titleText ? Icon.Checkmark : Icon.XMarkCircle,
          },
        ]}
      />
    </List>
  );
}
