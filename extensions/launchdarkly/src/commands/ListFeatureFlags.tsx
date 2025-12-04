import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useState } from "react";
import { LDFlag } from "../types";
import { useShowNamePreference } from "../hooks/useShowNamePreference";
import { useLDFlags } from "../hooks/useLDFlags";
import { getFullName } from "../utils/avatarUtils";
import { getLDUrlWithEnvs } from "../utils/ld-urls";
import FlagDetails from "../components/FlagDetails";

interface FetchPagination {
  hasMore: boolean;
  pageSize: number;
  onLoadMore: () => void;
}

export default function ListFeatureFlags() {
  const [searchText, setSearchText] = useState("");
  const [stateFilter, setStateFilter] = useState("live");

  const { showName, toggleShowName } = useShowNamePreference();

  const { flags, totalCount, isLoading, error, pagination, revalidate } = useLDFlags({ searchText, stateFilter }) as {
    flags: LDFlag[];
    totalCount: number;
    isLoading: boolean;
    error: Error | undefined;
    pagination: FetchPagination;
    revalidate: () => void;
  };

  const [selectedFlagKey, setSelectedFlagKey] = useState<string>();

  const handleSelectionChange = (id: string | null) => {
    setSelectedFlagKey(id || undefined);
  };

  function getVariationLabel(flag: LDFlag, index: number): string {
    const variation = flag.variations[index];
    const isOnVariation = flag.defaults?.onVariation === index;
    const isOffVariation = flag.defaults?.offVariation === index;
    let label = JSON.stringify(variation.value);

    if (isOnVariation) label += " (Default ON)";
    if (isOffVariation) label += " (Default OFF)";
    return label;
  }

  if (error) {
    return (
      <List>
        <List.EmptyView title="Error" description={error.message} />
      </List>
    );
  }

  const selectedFlag = selectedFlagKey ? flags.find((f) => f.key === selectedFlagKey) : undefined;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText || ""}
      onSearchTextChange={(value) => setSearchText(value || "")}
      selectedItemId={selectedFlagKey}
      onSelectionChange={handleSelectionChange}
      isShowingDetail
      pagination={{
        pageSize: 20,
        hasMore: pagination?.hasMore || false,
        onLoadMore: () => pagination?.onLoadMore?.(),
      }}
      filtering={false}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by State"
          onChange={(newValue) => {
            setStateFilter(newValue);
            revalidate();
          }}
        >
          <List.Dropdown.Item title="Live" value="live" />
          <List.Dropdown.Item title="Deprecated" value="deprecated" />
          <List.Dropdown.Item title="Archived" value="archived" />
        </List.Dropdown>
      }
    >
      <List.Section title="Feature Flags" subtitle={`${totalCount} flags found`}>
        {flags.map((flag) => {
          const maintainer = flag._maintainer;
          const icon = maintainer ? { source: getAvatarIcon(getFullName(maintainer)) } : Icon.Person;
          const displayTitle = showName === undefined ? flag.name : showName ? flag.name : flag.key;

          return (
            <List.Item
              key={flag.key}
              id={flag.key}
              icon={icon}
              title={displayTitle}
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.Sidebar} title="Show Details" target={<FlagDetails flag={flag} />} />
                  <Action.OpenInBrowser
                    icon={Icon.Globe}
                    title="Open in Browser"
                    url={getLDUrlWithEnvs(flag, [], undefined)}
                  />
                  <Action.CopyToClipboard title="Copy Feature Flag Key" content={flag.key} />
                  <Action
                    icon={Icon.Switch}
                    title={`Show ${showName ? "Key" : "Name"}`}
                    onAction={() => toggleShowName()}
                  />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Name"
                        text={selectedFlag?.name || selectedFlag?.key || ""}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Description"
                        text={selectedFlag?.description || "No description"}
                      />
                      <List.Item.Detail.Metadata.Label title="Kind" text={selectedFlag?.kind || "N/A"} />
                      {selectedFlag?.creationDate && (
                        <List.Item.Detail.Metadata.Label
                          title="Created"
                          text={new Date(selectedFlag.creationDate).toLocaleDateString()}
                        />
                      )}

                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.TagList title="Status">
                        {selectedFlag?.archived && (
                          <List.Item.Detail.Metadata.TagList.Item text="Archived" color={Color.Yellow} />
                        )}
                        {selectedFlag?.temporary && (
                          <List.Item.Detail.Metadata.TagList.Item text="Temporary" color={Color.Orange} />
                        )}
                        {selectedFlag?.deprecated && (
                          <List.Item.Detail.Metadata.TagList.Item text="Deprecated" color={Color.Red} />
                        )}
                      </List.Item.Detail.Metadata.TagList>

                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {selectedFlag?.tags && selectedFlag.tags.length > 0 ? (
                          selectedFlag.tags.map((tag) => (
                            <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                          ))
                        ) : (
                          <List.Item.Detail.Metadata.TagList.Item text="No tags" color={Color.SecondaryText} />
                        )}
                      </List.Item.Detail.Metadata.TagList>

                      {selectedFlag?._maintainer && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Maintainer" />
                          <List.Item.Detail.Metadata.Label
                            title="Name"
                            text={
                              `${selectedFlag._maintainer.firstName || ""} ${
                                selectedFlag._maintainer.lastName || ""
                              }`.trim() || "N/A"
                            }
                          />
                          {selectedFlag._maintainerTeam && (
                            <List.Item.Detail.Metadata.Label
                              title="Team"
                              text={selectedFlag._maintainerTeam.name || selectedFlag._maintainerTeam.key}
                            />
                          )}
                        </>
                      )}

                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Variations" />
                      {selectedFlag?.variations?.map((variation, index) => (
                        <List.Item.Detail.Metadata.Label
                          key={index}
                          title={`Variation ${index + 1}`}
                          text={getVariationLabel(selectedFlag, index)}
                        />
                      ))}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
