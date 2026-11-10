import { showError } from "@chrismessina/raycast-kit";
import { logger } from "@chrismessina/raycast-logger";
import { useState } from "react";
import { Icon, List, type LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Profile, UserItem } from "./components/profile";
import { parseUsername, searchUsers } from "./lib/api";

const log = (message: string, data?: Record<string, unknown>) => logger.log(message, data);

/**
 * With a username, its profile. Otherwise a search for people, which the server allows 120 times a minute, starting
 * from whatever was typed if it can't be a username.
 */
export default function Command(props: LaunchProps<{ arguments: Arguments.ViewProfile }>) {
  const typed = props.arguments.username?.trim() ?? "";
  const username = parseUsername(typed);
  if (username) return <Profile username={username} />;
  return <PeopleSearch initialText={typed} />;
}

function PeopleSearch({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText);
  const term = text.trim().replace(/^@/, "");
  const { data, isLoading, error } = useCachedPromise((query: string) => searchUsers(query, log), [term], {
    execute: term !== "",
    keepPreviousData: true,
    onError: (error) => void showError(error, { title: "Couldn't Search People" }),
  });

  return (
    <List
      throttle
      isLoading={isLoading}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="Search people by name or username"
    >
      {term === "" ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Search people on /dev/null" />
      ) : error && !isLoading ? (
        // A failed search keeps the last one's results in `data`; they don't belong under this search.
        <List.EmptyView icon={Icon.Warning} title="Couldn't search people" description={error.message} />
      ) : (
        <>
          {!isLoading && <List.EmptyView icon={Icon.PersonCircle} title={`No one matches “${term}”`} />}
          {data?.map((user) => (
            <UserItem key={user.username} user={user} />
          ))}
        </>
      )}
    </List>
  );
}
