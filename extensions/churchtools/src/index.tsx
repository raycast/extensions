import { ActionPanel, Action, List, Image } from "@raycast/api";
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
  }

  return (
    <List.Item
      title={domainObject.title}
      subtitle={domainObject.infos.join(", ")}
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
