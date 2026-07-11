import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useMemo } from "react";
import { IAMPrincipal } from "../IAMService";
import { formatRoleName } from "../../../utils/iamRoles";

interface IAMPrincipalListProps {
  principals: IAMPrincipal[];
  searchText: string;
  selectedType: string | null;
  selectedService: string | null;
  isLoading: boolean;
  onViewPrincipal: (principal: IAMPrincipal) => void;
  onAddRole: () => void;
  onRefresh: () => void;
  onSearchTextChange: (text: string) => void;
  onTypeChange: (type: string) => void;
}

export default function IAMPrincipalList({
  principals,
  searchText,
  selectedType,
  selectedService,
  isLoading,
  onViewPrincipal,
  onAddRole,
  onRefresh,
  onSearchTextChange,
  onTypeChange,
}: IAMPrincipalListProps) {
  const filteredPrincipals = useMemo(() => {
    return principals.filter((principal) => {
      if (
        searchText &&
        !principal.id.toLowerCase().includes(searchText.trim().toLowerCase()) &&
        !principal.roles.some(
          (role) =>
            role.role.toLowerCase().includes(searchText.trim().toLowerCase()) ||
            role.title.toLowerCase().includes(searchText.trim().toLowerCase()),
        )
      ) {
        return false;
      }

      if (selectedType && principal.type !== selectedType) {
        return false;
      }

      if (selectedService && !principal.roles.some((role) => role.role.includes(selectedService))) {
        return false;
      }

      return true;
    });
  }, [principals, searchText, selectedType, selectedService]);

  function getPrincipalIcon(type: string): { source: Icon; tintColor: Color } {
    switch (type) {
      case "user":
        return { source: Icon.Person, tintColor: Color.Blue };
      case "serviceAccount":
        return { source: Icon.Terminal, tintColor: Color.Green };
      case "group":
        return { source: Icon.TwoPeople, tintColor: Color.Purple };
      case "domain":
        return { source: Icon.Globe, tintColor: Color.Orange };
      default:
        return { source: Icon.Person, tintColor: Color.PrimaryText };
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search principals and roles..."
      onSearchTextChange={onSearchTextChange}
      filtering={{ keepSectionOrder: true }}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by principal type" value={selectedType || ""} onChange={onTypeChange}>
          <List.Dropdown.Item title="All Types" value="" />
          <List.Dropdown.Item title="User" value="user" />
          <List.Dropdown.Item title="Service Account" value="serviceAccount" />
          <List.Dropdown.Item title="Group" value="group" />
          <List.Dropdown.Item title="Domain" value="domain" />
        </List.Dropdown>
      }
    >
      {filteredPrincipals.length === 0 ? (
        <List.EmptyView
          title="No IAM principals found"
          description="Try adjusting your search or filters"
          icon={{ source: Icon.Person }}
          actions={
            <ActionPanel>
              <Action title="Add Role" icon={Icon.Plus} onAction={onAddRole} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
            </ActionPanel>
          }
        />
      ) : (
        filteredPrincipals.map((principal) => (
          <List.Item
            key={principal.id}
            title={principal.displayName || principal.email || principal.id}
            subtitle={principal.type}
            icon={getPrincipalIcon(principal.type)}
            accessories={[{ text: `${principal.roles.length} role${principal.roles.length !== 1 ? "s" : ""}` }]}
            actions={
              <ActionPanel>
                <Action title="View Principal" icon={Icon.Eye} onAction={() => onViewPrincipal(principal)} />
                <Action title="Add Role" icon={Icon.Plus} onAction={onAddRole} />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Principal" text={principal.id} />
                    <List.Item.Detail.Metadata.Label title="Type" text={principal.type} />
                    <List.Item.Detail.Metadata.Label title="Email" text={principal.email || "N/A"} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Roles" />
                    {principal.roles.map((role) => (
                      <List.Item.Detail.Metadata.Label
                        key={role.role}
                        title={formatRoleName(role.role)}
                        text={role.title}
                      />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))
      )}
    </List>
  );
}
