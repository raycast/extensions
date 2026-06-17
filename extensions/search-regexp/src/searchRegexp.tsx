import { List, ActionPanel, Action, clearSearchBar } from "@raycast/api";
import { useEffect, useState, useCallback, useMemo, memo } from "react";
import expressionsJSON from "../assets/expressions.json";
import CategoriesDropdown from "./components/CategoriesDropdown";
import ZipCodesList from "./components/ZipCodeList";
import { iconsMap } from "./icons";
import { MappedExpression } from "./types";
import { ellipsis, flatExpressions } from "./utilities";

interface ExpressionItemActionsProps {
  regexp: string;
  link?: string;
}

export const ExpressionItemActions = memo(({ regexp, link }: ExpressionItemActionsProps): JSX.Element => {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard content={regexp} title="Copy Regexp.." />
        {link && <Action.OpenInBrowser url={link} title="Show Example in Browser" />}
      </ActionPanel.Section>
    </ActionPanel>
  );
});

function ZipCodeItemActions({ expressions }: { expressions: MappedExpression[] }): JSX.Element {
  const memoizedExpressions = useMemo(() => expressions, [expressions]);
  return (
    <ActionPanel>
      <Action.Push title="Show ZIP Codes" target={<ZipCodesList expressions={memoizedExpressions} />} />
    </ActionPanel>
  );
}

export default function Command() {
  const { defaultExpressions, zipCodesExpressions, regexpCategories } = useMemo(
    () => flatExpressions(expressionsJSON),
    [expressionsJSON]
  );

  const [search, setSearch] = useState<string>("");
  const [filteredExpressions, setFilteredExpressions] = useState<MappedExpression[]>(defaultExpressions);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    setFilteredExpressions(
      defaultExpressions.filter((expression: MappedExpression) => {
        return (
          (expression.displayName.toLowerCase().includes(search.toLowerCase()) ||
            expression.name.toLowerCase().includes(search.toLowerCase())) &&
          (selectedCategory === "all" || selectedCategory === expression.category)
        );
      })
    );
  }, [search, defaultExpressions, selectedCategory]);

  const handleCategoryChange = useCallback(
    (category: string) => {
      if (category === selectedCategory) {
        return;
      }
      setSelectedCategory(category);
      setSearch("");
    },
    [selectedCategory]
  );

  useEffect(() => {
    if (search.trim() != "") {
      return;
    }
    (async () => {
      await clearSearchBar({ forceScrollToTop: true });
    })();
  }, [search]);

  return (
    <List
      filtering={false}
      searchBarPlaceholder={"Search regular expression..."}
      onSearchTextChange={setSearch}
      searchBarAccessory={<CategoriesDropdown categories={regexpCategories} onCategoryChange={handleCategoryChange} />}
    >
      {filteredExpressions.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          icon={iconsMap.get(item.category)}
          subtitle={ellipsis(item.regexp!)}
          accessories={[{ text: item.displayName, tooltip: item.displayName }]}
          actions={
            item.category !== "zipcode" ? (
              <ExpressionItemActions regexp={item.regexp!} link={item.link} />
            ) : (
              <ZipCodeItemActions expressions={zipCodesExpressions} />
            )
          }
        />
      ))}
    </List>
  );
}
