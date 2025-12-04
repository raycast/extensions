import { Action, ActionPanel, clearSearchBar, Color, Icon, List, showToast, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import React, { useCallback } from "react";

import { useAutoComplete, QueryOptionResult } from "../hooks/";
import { ConfigView } from "../views";

interface ACListItemProps extends QueryOptionResult {
  id?: string;
  onAction: (query: string, callback?: () => void) => void;
}

const ACListItem = React.memo((option: ACListItemProps) => {
  const { icon, query, onAction, subtitle, isFinal, id, ...restOpt } = option;
  const queryValidate = (query: string): [string?, string?] | [] => {
    const [type, key, value] = query.trim().split(" ");
    return (!!key && type === "-set" && [key, value]) || [];
  };
  const [key, value] = queryValidate(query);
  //it's ok to initial with empty key, since the parent never calls setCache on invalid key such that the current query is incomplete.
  const [cachedVal, setCache] = useCachedState<string | undefined>(key || "");

  return (
    <List.Item
      icon={icon || Icon.Terminal}
      subtitle={subtitle || id}
      {...restOpt}
      actions={
        <ActionPanel>
          <Action
            title="Select"
            onAction={() =>
              onAction(`${query} `, () => {
                setCache(value);
              })
            }
          />
        </ActionPanel>
      }
      accessories={[
        ...((!isFinal &&
          !restOpt.strict && [{ text: `Current:` }, { text: { value: `${cachedVal}`, color: Color.Orange } }]) ||
          []),
        { tag: { value: query, color: Color.Green } },
      ]}
    />
  );
});

interface AutoCompleteListProps {
  query: string;
  setQuery: (query: string) => void;
}
const AutoCompleteList = (props: AutoCompleteListProps) => {
  const { query, setQuery } = props;
  const { push } = useNavigation();
  const matchedOptions = useAutoComplete({ query });
  const onSelect = useCallback((expectQuery: string) => {
    setQuery(expectQuery);
  }, []);
  const onConfirm = useCallback(async (expectQuery: string, callback?: () => void) => {
    if (expectQuery.startsWith("-config")) {
      push(<ConfigView />);
    } else {
      callback && callback();
      await showToast({ title: "Success", message: `'${expectQuery}' done.` });
      await clearSearchBar();
    }
  }, []);
  const renderAutoCompleteItems = (matchedOptions: QueryOptionResult[]) => {
    return (
      <List.Section title="Available config options" subtitle="enter to autocomplete">
        {matchedOptions.map((option) => (
          <ACListItem id={option.key} onAction={onSelect} {...option} />
        ))}
      </List.Section>
    );
  };
  const renderExecuteItem = (matchedOption: QueryOptionResult) => {
    const { icon, title, ...resOptions } = matchedOption;
    const executeTitle = `Confirm for [${title}]?`;
    return <ACListItem icon={icon || Icon.Cog} onAction={onConfirm} title={executeTitle} {...resOptions} />;
  };
  return matchedOptions.length
    ? matchedOptions[0].isFinal && query.trim() === matchedOptions[0].query.trim()
      ? renderExecuteItem(matchedOptions[0])
      : renderAutoCompleteItems(matchedOptions)
    : null;
};

export default React.memo(
  AutoCompleteList,
  (prevProps, nextProps) =>
    (!prevProps.query.startsWith("-") && !nextProps.query.startsWith("-")) || prevProps.query === nextProps.query
);
