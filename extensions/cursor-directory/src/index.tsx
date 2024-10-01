import { List, ActionPanel, Icon, showToast, Toast, getPreferenceValues, Action, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getSections } from "./utils";
import { useState, useEffect } from "react";
import { fetchCursorRules, starRule, unstarRule } from "./api";
import { getStarredRules } from "./api";
import { CursorRulePreview } from "./components/CursorRulePreview";
import { CopyRuleAction } from "./components/actions/CopyRuleAction";
import { ViewRuleAction } from "./components/actions/ViewRuleAction";
import { OpenPrefAction } from "./components/actions/OpenPrefAction";
import { ToggleViewAction } from "./components/actions/ToggleViewAction";

export default function Command() {
  const { show_detailed_view, default_cursor_rules_list } = getPreferenceValues<Preferences>();

  const [error, setError] = useState<Error | undefined>(undefined);
  const [showingDetail, setShowingDetail] = useState<boolean>(show_detailed_view);
  const [popularOnly, setPopularOnly] = useState<boolean>(default_cursor_rules_list === "popular");

  const { data, isLoading, revalidate } = usePromise(async () => {
    try {
      return await fetchCursorRules(popularOnly);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  });

  const {
    data: starredRulesData,
    isLoading: isLoadingStarredRules,
    revalidate: revalidateStarredRules,
  } = usePromise(async () => {
    try {
      return await getStarredRules();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  });

  useEffect(() => {
    if (error) {
      console.error("Error fetching cursor rules: ", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong: ",
        message: error.message,
      });
    }
  }, [error]);

  const allRules = data || [];

  const cursorRules = allRules.filter((rule) => !starredRulesData?.includes(rule.slug));

  const sections = getSections(cursorRules, popularOnly);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Cursor Rules"
          onChange={(newValue) => {
            setPopularOnly(newValue === "popular");
            revalidate();
          }}
          defaultValue={popularOnly ? "popular" : "all"}
        >
          <List.Dropdown.Item title="All Cursor Rules" value="all" />
          <List.Dropdown.Item title="Popular Cursor Rules" value="popular" />
        </List.Dropdown>
      }
    >
      {isLoadingStarredRules ? (
        <List.EmptyView title="Loading starred cursor rules..." />
      ) : (
        starredRulesData &&
        starredRulesData.length > 0 && (
          <List.Section title="Starred Cursor Rules">
            {starredRulesData.map((data) => {
              const cursorRule = allRules.find((item) => item.slug === data);

              if (!cursorRule) return null;

              const props = showingDetail
                ? {
                    detail: <CursorRulePreview cursorRule={cursorRule} popularOnly={popularOnly} />,
                  }
                : {
                    accessories: [
                      { text: cursorRule.tags.slice(0, 3).join(", ") },
                      ...(popularOnly && cursorRule.count !== null
                        ? [{ icon: Icon.Person, text: cursorRule.count.toString() }]
                        : []),
                      { icon: { source: Icon.Star, tintColor: Color.Yellow } },
                    ],
                  };

              return (
                <List.Item
                  key={cursorRule.slug}
                  title={cursorRule.title}
                  {...props}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Actions">
                        <ViewRuleAction cursorRule={cursorRule} popularOnly={popularOnly} />
                        <CopyRuleAction cursorRule={cursorRule} />
                        <ToggleViewAction showingDetail={showingDetail} setShowingDetail={setShowingDetail} />
                        <Action
                          title="Unstar Cursor Rule"
                          icon={Icon.StarDisabled}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                          onAction={async () => {
                            await unstarRule(cursorRule.slug);
                            await revalidateStarredRules();
                            await revalidate();
                          }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Settings">
                        <OpenPrefAction />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        )
      )}
      {sections.length > 0 &&
        sections.map((section) => (
          <List.Section key={section.name} title={section.name}>
            {section.slugs.map((slug) => {
              const cursorRule = cursorRules.find((item) => item.slug === slug);
              if (!cursorRule) return null;
              const props = showingDetail
                ? {
                    detail: <CursorRulePreview cursorRule={cursorRule} section={section} popularOnly={popularOnly} />,
                  }
                : {
                    accessories: [
                      { text: cursorRule.tags.slice(0, 3).join(", ") },
                      ...(popularOnly && cursorRule.count !== null
                        ? [{ icon: Icon.Person, text: cursorRule.count.toString() }]
                        : []),
                      { icon: Icon.StarDisabled },
                    ],
                  };

              return (
                <List.Item
                  key={cursorRule.slug}
                  title={cursorRule.title}
                  {...props}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Actions">
                        <ViewRuleAction cursorRule={cursorRule} popularOnly={popularOnly} />
                        <CopyRuleAction cursorRule={cursorRule} />
                        <ToggleViewAction showingDetail={showingDetail} setShowingDetail={setShowingDetail} />
                        <Action
                          title="Star Cursor Rule"
                          icon={Icon.Star}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                          onAction={async () => {
                            await starRule(cursorRule.slug);
                            await revalidateStarredRules();
                            await revalidate();
                          }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Settings">
                        <OpenPrefAction />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))}
    </List>
  );
}
