import { Color, Icon, List } from "@raycast/api";
import React, { useContext } from "react";
import { SearchContext } from "../hooks";
import { DefListRts, isDefSection, DefItem } from "../types";
import DefActionPanel from "./ActionPanels";

interface Props {
  data:
    | {
        defs: DefListRts;
        extras?: DefListRts;
      }
    | undefined;
  setQuery?: (query: string) => void;
  // isDetailShowing: boolean;
}

const searchItem =
  (withDetail = false) =>
  (props: DefItem) => {
    const { markdown, subtitle: origSubtitle, metaData = {}, accessories: accessor = [], ...resOpts } = props;
    let subtitle = origSubtitle;
    const accessories = [...accessor];
    if (withDetail) {
      const { supportTTS = [] } = metaData;
      const searchState = useContext(SearchContext);
      subtitle = (!searchState.isShowingDetail && origSubtitle) || undefined;
      const ttsReady = supportTTS[0] && supportTTS[0] === searchState.curTTS[0];
      if (ttsReady) {
        accessories.push({
          icon: Icon.SpeechBubbleActive,
          tag: { value: `TTS available`, color: Color.Green },
        });
      }
    }

    const detail = markdown && <List.Item.Detail markdown={markdown} />;
    return (
      <List.Item
        {...resOpts}
        detail={detail}
        key={resOpts.id}
        accessories={accessories}
        subtitle={subtitle}
        actions={props.metaData && <DefActionPanel defItem={props} />}
      />
    );
  };
const SearchDetailedItem = searchItem(true);
const SearchItem = searchItem();

const renderSearchItem = (item: DefItem, withDetail: boolean, fallbackKey: React.Key) => {
  const { key, ...itemProps } = item;
  const Item = withDetail ? SearchDetailedItem : SearchItem;
  return <Item key={key ?? item.id ?? fallbackKey} {...itemProps} />;
};

const HeaderSection = (props: { headers: DefListRts }) => {
  const { headers = [] } = props;
  return (
    <>
      {headers.map((entry, index) => {
        if (isDefSection(entry)) {
          return (
            <List.Section title={entry.title} key={entry.title}>
              {entry.defItems.map((def, defIndex) => renderSearchItem(def, true, `${entry.title}-${defIndex}`))}
            </List.Section>
          );
        }
        return renderSearchItem(entry, true, index);
      })}
    </>
  );
};

const SearchResultList = (props: Props) => {
  const { data: { defs = [], extras = [] } = {} } = props;
  return (
    <>
      {extras && <HeaderSection headers={extras} />}
      {defs.map((entry, index) => {
        if (isDefSection(entry)) {
          return (
            <List.Section title={entry.title} key={entry.title}>
              {entry.defItems.map((def, defIndex) =>
                renderSearchItem(def, Boolean(def.markdown), `${entry.title}-${defIndex}`),
              )}
            </List.Section>
          );
        }
        return renderSearchItem(entry, Boolean(entry.markdown), index);
      })}
    </>
  );
};

export default React.memo(SearchResultList);
