import React, { useState } from "react";
import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { fetchPeopleByName, getDetailsPageUrl } from "./goodreads-api";
import { STRINGS } from "./strings";
import { useCachedPromise } from "@raycast/utils";
import type { Person } from "./types";
import AuthorDetails from "./person-details";

interface SearchPeoplePageProps {
  arguments: {
    name: string;
  };
}

export default function SearchPeoplePage(props: SearchPeoplePageProps) {
  const [searchQuery, setSearch] = useState(props.arguments.name);
  const { data, isLoading } = useCachedPromise(fetchPeopleByName, [searchQuery], { execute: searchQuery?.length > 0 });

  return (
    <List
      isLoading={isLoading}
      searchText={searchQuery}
      throttle
      searchBarPlaceholder={STRINGS.searchPeoplePlaceholder}
      onSearchTextChange={setSearch}
    >
      {data?.data?.map((author) => (
        <Person key={author.id} person={author} />
      ))}
    </List>
  );
}

interface PersonProps {
  person: Person;
}

function Person(props: PersonProps) {
  const { person } = props;
  const { name, booksCount, friendsCount, avatar, contentUrl } = person;
  const subtitle = `${booksCount} · ${friendsCount}`;
  const detailsPageUrl = getDetailsPageUrl(contentUrl.detailsPage);

  return (
    <List.Item
      title={name}
      subtitle={subtitle}
      icon={avatar ? { source: avatar } : Icon.Person}
      actions={
        <ActionPanel>
          <>
            <Action.Push
              icon={Icon.Window}
              title={STRINGS.showDetails}
              target={<AuthorDetails name={name} qualifier={contentUrl.detailsPage} />}
            />
            <Action.OpenInBrowser url={getDetailsPageUrl(detailsPageUrl)} />
          </>

          <ActionPanel.Section>
            <Action.CopyToClipboard shortcut={Keyboard.Shortcut.Common.Pin} title={STRINGS.copyTitle} content={name} />
            <Action.CopyToClipboard
              shortcut={Keyboard.Shortcut.Common.CopyPath}
              title={STRINGS.copyUrl}
              content={detailsPageUrl}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
