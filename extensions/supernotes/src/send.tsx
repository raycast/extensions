import { Action, ActionPanel, Clipboard, getSelectedText, Icon, List } from "@raycast/api";
import React from "react";

import { CardAppendListItem } from "~/components/CardListItem";
import { useRecentCards } from "~/hooks/useRecent";
import useSearch from "~/hooks/useSearch";
import { sendToDaily, sendToNew } from "~/utils/senders";
import { ICardCollection } from "~/utils/types";

type ClippingType = "selection" | "clipboard";

interface Clipping {
  type?: ClippingType;
  selected?: string;
  clipboard?: string;
}

const SendClipping = () => {
  const [resultCards, setResultCards] = React.useState<ICardCollection>();
  const { search, loading: searchLoading } = useSearch((results) => setResultCards(results));
  const { cards: recentCards, loading: recentsLoading } = useRecentCards();

  const [clipping, setClipping] = React.useState<Clipping>({});
  React.useEffect(() => {
    Promise.allSettled([getSelectedText(), Clipboard.readText()]).then(([selected, clipboard]) => {
      const selectedVal =
        selected.status === "fulfilled" && selected.value.length ? selected.value : undefined;
      const clipboardVal =
        clipboard.status === "fulfilled" && clipboard.value?.length ? clipboard.value : undefined;
      setClipping({
        type: selectedVal ? "selection" : clipboardVal ? "clipboard" : undefined,
        selected: selectedVal,
        clipboard: clipboardVal,
      });
    });
  }, []);

  const currentText = clipping.type === "selection" ? clipping.selected : clipping.clipboard;
  const hasClipping = !!currentText;
  const Detail = <List.Item.Detail markdown={currentText} />;

  return (
    <List
      throttle
      isLoading={searchLoading || recentsLoading}
      isShowingDetail={hasClipping}
      onSearchTextChange={search}
      searchBarPlaceholder="Send your clipping somewhere..."
      searchBarAccessory={
        hasClipping ? (
          <List.Dropdown
            tooltip="Select clipping type"
            value={clipping.type}
            onChange={(value) => setClipping((p) => ({ ...p, type: value as ClippingType }))}
          >
            {clipping.selected && <List.Dropdown.Item title="selection" value="selection" />}
            {clipping.clipboard && <List.Dropdown.Item title="clipboard" value="clipboard" />}
          </List.Dropdown>
        ) : undefined
      }
    >
      {currentText ? (
        <>
          {resultCards ? (
            Object.values(resultCards).map((card) => (
              <CardAppendListItem
                key={card.data.id}
                card={card}
                detail={Detail}
                text={currentText}
              />
            ))
          ) : (
            <>
              <List.Item
                title="Append to daily card"
                icon={Icon.PlusCircle}
                detail={Detail}
                actions={
                  <ActionPanel>
                    <Action
                      onAction={() => sendToDaily(currentText)}
                      title="Append to Daily card"
                    />
                  </ActionPanel>
                }
              />
              <List.Item
                title="Create new card"
                icon={Icon.NewDocument}
                detail={Detail}
                actions={
                  <ActionPanel>
                    <Action onAction={() => sendToNew(currentText)} title="Create new card" />
                  </ActionPanel>
                }
              />
              <List.Section title="Recent Cards">
                {recentCards?.map((card) => (
                  <CardAppendListItem
                    key={card.data.id}
                    card={card}
                    detail={Detail}
                    text={currentText}
                  />
                ))}
              </List.Section>
            </>
          )}
        </>
      ) : (
        <List.EmptyView
          icon={Icon.TextSelection}
          title={
            clipping.type === "selection"
              ? "Select some text to get started"
              : "Copy text to your clipboard to get started"
          }
        />
      )}
    </List>
  );
};

export default SendClipping;
