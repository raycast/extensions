import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { AuthEmptyView, isAuthError, showError } from "./components/errors";
import { searchCourseCatalog } from "./lib/courses";
import { getLanguage } from "./lib/prefs";

export default function SearchCourseCatalog(props: LaunchProps<{ arguments: Arguments.SearchCourseCatalog }>) {
  const lang = getLanguage();
  const [query, setQuery] = useState(props.arguments.query?.trim() ?? "");
  const trimmed = query.trim();
  const { data, isLoading, error } = useCachedPromise(searchCourseCatalog, [trimmed, lang], {
    execute: trimmed.length >= 2,
    keepPreviousData: true,
    onError: showError,
  });

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search all WeBeep courses by name or code…"
    >
      {error && isAuthError(error) ? (
        <AuthEmptyView error={error} />
      ) : trimmed.length < 2 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search the WeBeep catalog"
          description="Type at least two characters of a course name or code"
        />
      ) : data && data.length === 0 ? (
        <List.EmptyView
          icon={Icon.Book}
          title="No courses match"
          description="Try a shorter name or the six-digit course code"
        />
      ) : (
        data?.map((course) => (
          <List.Item
            key={course.id}
            title={course.name}
            subtitle={course.code}
            icon={Icon.Book}
            keywords={[course.teachers ?? "", course.year ?? "", course.categoryName ?? ""].filter(Boolean)}
            accessories={[
              ...(course.teachers ? [{ text: course.teachers, tooltip: "Teachers" }] : []),
              ...(course.year ? [{ tag: course.year }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={course.viewUrl} />
                <Action.CopyToClipboard
                  title="Copy Link"
                  content={course.viewUrl}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
