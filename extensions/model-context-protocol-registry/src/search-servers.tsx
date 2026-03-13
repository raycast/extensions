import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { REGISTRIES } from "./registries";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setShowingDetail] = useCachedState("isShowingDetail", true);
  const [selectedRegistryId, setSelectedRegistryId] = useCachedState("registry", REGISTRIES[0].id);
  const [pagination, setPagination] = useState<List.Props["pagination"]>(undefined);
  const [isLoading, setIsLoading] = useState<List.Props["isLoading"]>(undefined);

  useEffect(() => {
    setPagination(undefined);
    setIsLoading(undefined);
  }, [selectedRegistryId]);

  const selectedRegistry = useMemo(
    () => REGISTRIES.find((registry) => registry.id === selectedRegistryId) ?? REGISTRIES[0],
    [selectedRegistryId],
  );

  const RegistryComponent = selectedRegistry.component;

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      isShowingDetail={isShowingDetail}
      searchText={searchText}
      throttle={selectedRegistry?.throttle}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Registry" value={selectedRegistryId} onChange={setSelectedRegistryId}>
          {REGISTRIES.map((registry) => (
            <List.Dropdown.Item key={registry.id} icon={registry.icon} title={registry.title} value={registry.id} />
          ))}
        </List.Dropdown>
      }
    >
      <RegistryComponent
        key={selectedRegistryId}
        searchText={searchText}
        isShowingDetail={isShowingDetail}
        setShowingDetail={setShowingDetail}
        pagination={pagination}
        setPagination={setPagination}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    </List>
  );
}
