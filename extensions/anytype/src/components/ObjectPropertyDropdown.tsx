import { Form } from "@raycast/api";
import { useMemo, useState } from "react";
import { useMembers, useSearch } from "../hooks";
import { defaultTintColor, memberMatchesSearch } from "../utils";

interface ObjectPropertyDropdownProps {
  propertyKey: string;
  title: string;
  value: string;
  spaceId: string;
  spaceName?: string;
  excludeObjectId?: string;
  restItemProps: Record<string, unknown>;
}

export function ObjectPropertyDropdown({
  propertyKey,
  title,
  value,
  spaceId,
  spaceName,
  excludeObjectId,
  restItemProps,
}: ObjectPropertyDropdownProps) {
  const [searchText, setSearchText] = useState("");

  const { objects: searchObjects } = useSearch(spaceId, searchText, []);
  const { members } = useMembers(spaceId, searchText);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => memberMatchesSearch(member, searchText));
  }, [members, searchText]);

  const combinedObjects = useMemo(() => {
    return [...(searchObjects || []), ...filteredMembers];
  }, [searchObjects, filteredMembers]);

  const filteredObjects = useMemo(() => {
    if (excludeObjectId) {
      return combinedObjects.filter((candidate) => candidate.id !== excludeObjectId);
    }
    return combinedObjects;
  }, [combinedObjects, excludeObjectId]);

  const placeholder = spaceName ? `Search objects in '${spaceName}'...` : "Select object";

  return (
    <Form.Dropdown
      {...restItemProps}
      id={propertyKey}
      key={propertyKey}
      title={title}
      value={value}
      onSearchTextChange={setSearchText}
      throttle={true}
      placeholder={placeholder}
    >
      {!searchText.trim() && (
        <Form.Dropdown.Item
          key="none"
          value=""
          title="No Object"
          icon={{ source: "icons/type/document.svg", tintColor: defaultTintColor }}
        />
      )}
      {filteredObjects.map((object) => (
        <Form.Dropdown.Item key={object.id} value={object.id} title={object.name} icon={object.icon} />
      ))}
    </Form.Dropdown>
  );
}
