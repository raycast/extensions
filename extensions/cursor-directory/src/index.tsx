import { List, ActionPanel, Icon, showToast, Toast, getPreferenceValues, Action, Color, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getSections } from "./utils";
import { useState, useEffect } from "react";
import { fetchCursorRules, fetchLocalRules, starRule, unstarRule } from "./api";
import { getStarredRules } from "./api";
import { CursorRulePreview } from "./components/CursorRulePreview";
import { CopyRuleAction } from "./components/actions/CopyRuleAction";
import { ViewRuleAction } from "./components/actions/ViewRuleAction";
import { OpenPrefAction } from "./components/actions/OpenPrefAction";
import { ToggleViewAction } from "./components/actions/ToggleViewAction";
import { ExportAndEditAction } from "./components/actions/ExportAndEditAction";
import { CursorRule } from "./types";
import { MAX_STARRED_RULES } from "./constants";

export default function Command() {
  const { showDetailedView, defaultCursorRulesList } = getPreferenceValues<Preferences>();

  const [error, setError] = useState<Error | undefined>(undefined);
  const [showingDetail, setShowingDetail] = useState<boolean>(showDetailedView);
  const [popularOnly, setPopularOnly] = useState<boolean>(defaultCursorRulesList === "popular");

  const {
    data: remoteRules,
    isLoading: isLoadingRemoteRules,
    revalidate: revalidateRemoteRules,
  } = usePromise(async () => {
    try {
      return await fetchCursorRules(popularOnly);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  });

  const {
    data: localRules,
    isLoading: isLoadingLocalRules,
    revalidate: revalidateLocalRules,
  } = usePromise(async () => {
    try {
      return await fetchLocalRules();
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

  const allRules = [...(localRules || []), ...(remoteRules || [])];

  const starredRules = allRules.filter((rule) => starredRulesData?.includes(rule.slug));

  const nonStarredRemoteRules = remoteRules?.filter((rule) => !starredRulesData?.includes(rule.slug)) || [];

  const sections = getSections(nonStarredRemoteRules, popularOnly);

  const renderRuleItem = (cursorRule: CursorRule, isStarred: boolean) => {
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
            { icon: cursorRule.isLocal ? { source: Icon.Circle, tintColor: Color.Blue } : Icon.CircleDisabled },
            { icon: isStarred ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.StarDisabled },
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
              <ExportAndEditAction
                cursorRule={cursorRule}
                onAction={async () => {
                  await revalidateLocalRules();
                }}
              />
              <ToggleViewAction showingDetail={showingDetail} setShowingDetail={setShowingDetail} />
              <Action
                title={isStarred ? "Unstar Cursor Rule" : "Star Cursor Rule"}
                icon={isStarred ? Icon.StarDisabled : Icon.Star}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={async () => {
                  if (isStarred) {
                    await unstarRule(cursorRule.slug);
                  } else {
                    await starRule(cursorRule.slug);
                  }
                  await revalidateStarredRules();
                  await revalidateRemoteRules();
                  await revalidateLocalRules();
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
  };

  return (
    <List
      isLoading={isLoadingRemoteRules || isLoadingLocalRules || isLoadingStarredRules}
      isShowingDetail={showingDetail}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Cursor Rules"
          onChange={(newValue) => {
            setPopularOnly(newValue === "popular");
            revalidateRemoteRules();
          }}
          defaultValue={popularOnly ? "popular" : "all"}
        >
          <List.Dropdown.Item title="All Cursor Rules" value="all" />
          <List.Dropdown.Item title="Popular Cursor Rules" value="popular" />
        </List.Dropdown>
      }
    >
      {starredRules.length > 0 && (
        <List.Section title="Starred Cursor Rules" subtitle={`${starredRules.length} / ${MAX_STARRED_RULES}`}>
          {starredRules.map((cursorRule) => {
            return renderRuleItem(cursorRule, true);
          })}
        </List.Section>
      )}
      {localRules && localRules.length > 0 && (
        <List.Section title="Local Cursor Rules" subtitle={`${localRules.length}`}>
          {localRules.map((cursorRule) =>
            renderRuleItem(cursorRule, starredRulesData?.includes(cursorRule.slug) || false),
          )}
        </List.Section>
      )}
      {sections.length > 0 &&
        sections.map((section) => (
          <List.Section key={section.name} title={section.name} subtitle={`${section.slugs.length}`}>
            {section.slugs.map((slug) => {
              const cursorRule = nonStarredRemoteRules.find((item) => item.slug === slug);
              if (!cursorRule) return null;
              return renderRuleItem(cursorRule, starredRulesData?.includes(cursorRule.slug) || false);
            })}
          </List.Section>
        ))}
    </List>
  );
}
