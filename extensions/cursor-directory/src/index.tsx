import { List, ActionPanel, Icon, showToast, Toast, getPreferenceValues, Action, Color, Keyboard } from "@raycast/api";
import { getSections } from "./utils";
import { useState, useEffect, useMemo, useCallback } from "react";
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
import { usePromise } from "@raycast/utils";

export default function Command() {
  const { showDetailedView, defaultCursorRulesList } = getPreferenceValues<Preferences>();

  const [error, setError] = useState<Error | undefined>(undefined);
  const [showingDetail, setShowingDetail] = useState<boolean>(showDetailedView);
  const [popularOnly, setPopularOnly] = useState<boolean>(defaultCursorRulesList === "popular");

  const {
    data: remoteRules,
    isLoading: isLoadingRemote,
    error: remoteError,
    revalidate: revalidateRemoteRules,
  } = usePromise<(popularOnly: boolean) => Promise<CursorRule[]>>(fetchCursorRules, [popularOnly]);

  const {
    data: localRules,
    isLoading: isLoadingLocal,
    error: localError,
    revalidate: revalidateLocalRules,
  } = usePromise(fetchLocalRules, []);

  const {
    data: starredRules,
    isLoading: isLoadingStarred,
    error: starredError,
    revalidate: revalidateStarredRules,
  } = usePromise(getStarredRules, []);

  const handleError = useCallback((error: Error, action: string) => {
    console.error(`Error ${action}:`, error);
    showToast({
      style: Toast.Style.Failure,
      title: `Error ${action}`,
      message: error.message,
    });
  }, []);

  useEffect(() => {
    setError(remoteError || localError || starredError);
    if (error) {
      console.error("Error fetching cursor rules: ", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong: ",
        message: error.message,
      });
    }
  }, [error]);

  const allRules = useMemo(() => {
    return remoteRules && localRules ? [...localRules, ...remoteRules] : [];
  }, [localRules, remoteRules]);

  const starredRuleItems = useMemo(() => {
    return allRules.filter((rule) => starredRules?.includes(rule.slug));
  }, [allRules, starredRules]);

  const nonStarredRemoteRules = useMemo(() => {
    return remoteRules ? remoteRules.filter((rule) => !starredRules?.includes(rule.slug)) : [];
  }, [remoteRules, starredRules]);

  const sections = useMemo(() => getSections(nonStarredRemoteRules, popularOnly), [nonStarredRemoteRules, popularOnly]);

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
                  try {
                    await revalidateLocalRules();
                  } catch (error) {
                    handleError(error as Error, "updating local rules");
                  }
                }}
              />
              <ToggleViewAction showingDetail={showingDetail} setShowingDetail={setShowingDetail} />
              <Action
                title={isStarred ? "Unstar Cursor Rule" : "Star Cursor Rule"}
                icon={isStarred ? Icon.StarDisabled : Icon.Star}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={async () => {
                  try {
                    if (isStarred) {
                      await unstarRule(cursorRule.slug);
                    } else {
                      await starRule(cursorRule.slug);
                    }
                    await revalidateStarredRules();
                  } catch (error) {
                    handleError(error as Error, "starring/unstarring cursor rule");
                  }
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
      isLoading={isLoadingRemote || isLoadingLocal || isLoadingStarred}
      isShowingDetail={showingDetail}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Cursor Rules"
          onChange={async (newValue) => {
            setPopularOnly(newValue === "popular");
            await revalidateRemoteRules();
          }}
          defaultValue={popularOnly ? "popular" : "all"}
        >
          <List.Dropdown.Item title="All Cursor Rules" value="all" />
          <List.Dropdown.Item title="Popular Cursor Rules" value="popular" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView title="Something went wrong" description={error.message} icon={Icon.XMarkCircle} />
      ) : (
        <>
          <List.Section title="Starred Cursor Rules" subtitle={`${starredRuleItems.length} / ${MAX_STARRED_RULES}`}>
            {starredRuleItems.length > 0 ? (
              starredRuleItems.map((rule) => renderRuleItem(rule, true))
            ) : (
              <List.Item title="No starred rules" />
            )}
            {isLoadingRemote && starredRuleItems.length < MAX_STARRED_RULES && (
              <List.Item title="Loading potential starred rules..." icon={Icon.Circle} />
            )}
          </List.Section>

          <List.Section title="Local Cursor Rules" subtitle={localRules ? `${localRules.length}` : "0"}>
            {localRules && localRules.length > 0 ? (
              localRules.map((rule) => renderRuleItem(rule, starredRules?.includes(rule.slug) || false))
            ) : (
              <List.Item
                title={isLoadingLocal ? "Loading local rules..." : "No local rules"}
                icon={isLoadingLocal ? Icon.Circle : Icon.Dot}
              />
            )}
          </List.Section>

          {sections.length > 0 &&
            sections.map((section) => (
              <List.Section key={section.name} title={section.name} subtitle={`${section.slugs.length}`}>
                {section.slugs.map((slug) => {
                  const rule = nonStarredRemoteRules.find((item) => item.slug === slug);
                  return rule ? renderRuleItem(rule, false) : null;
                })}
              </List.Section>
            ))}
        </>
      )}
    </List>
  );
}
