import { ActionPanel, Action, List, Image, Icon } from "@raycast/api";
import { useState } from "react";
import { useSearch } from "./hooks/useSearch";
import { DomainObjectType } from "./schemas/DomainObjectSchema";
import { getAvatarIcon } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { domainObjects, isLoading: isSearching } = useSearch(searchText);

  return (
    <List
      isLoading={isSearching}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search ChurchTools..."
      throttle
    >
      <List.Section title="Results" subtitle={domainObjects.length + ""}>
        {domainObjects?.map((domainObject) => (
          <DomainObjectListItem key={domainObject.domainIdentifier} domainObject={domainObject} />
        ))}
      </List.Section>
    </List>
  );
}

function DomainObjectListItem({ domainObject }: { domainObject: DomainObjectType }) {
  let icon: Image.ImageLike | undefined = undefined;

  switch (domainObject.domainType) {
    case "person":
      if (domainObject.imageUrl) {
        icon = {
          source: domainObject.imageUrl,
          mask: Image.Mask.Circle,
        };
      } else {
        icon = getAvatarIcon(domainObject.title);
      }
      break;
    case "group":
      if (domainObject.imageUrl) {
        icon = {
          source: domainObject.imageUrl,
          mask: Image.Mask.RoundedRectangle,
        };
      } else {
        icon = getAvatarIcon(domainObject.title);
      }
      break;
    case "wiki_page":
      icon = Icon.Book;
      break;
    case "song":
      icon = Icon.Music;
      break;
  }

  let subtitle = "";

  switch (domainObject.domainType) {
    case "person":
      subtitle = "Person";
      break;
    case "group":
      subtitle = "Group";
      break;
    case "wiki_page":
      subtitle = "Wiki Page";
      break;
    case "song":
      subtitle = "Song";
      break;
  }

  return (
    <List.Item
      title={domainObject.title}
      subtitle={subtitle}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in ChurchTools (Browser)" url={domainObject.frontendUrl} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      icon={icon}
    />
  );
}
