import { Icon, Image, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { listOrgs, getAllOrgMetadata } from "./lib/sfdx";

const DEFAULT_ORG_COLOR = "#0284C7";

export interface OrgOption {
  value: string;
  title: string;
  icon: Image.ImageLike;
}

export function useDefaultOrgSelection(initialOrg = "") {
  const [selectedOrg, setSelectedOrg] = useState(initialOrg);

  const {
    data: orgs,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(listOrgs, [], {
    keepPreviousData: true,
  });

  useEffect(() => {
    if (orgs && selectedOrg === "" && !initialOrg) {
      const defaultOrg = orgs.find((org) => org.isDefaultUsername);
      if (defaultOrg) setSelectedOrg(defaultOrg.alias || defaultOrg.username);
    }
  }, [orgs, selectedOrg, initialOrg]);

  return { selectedOrg, setSelectedOrg, orgs, isLoading, error, revalidate };
}

// Shared option list for org dropdowns: value is alias/username (what sfdx
// functions expect), title prefers the user's custom label, icon is a cloud
// tinted with the org's color so the collapsed dropdown shows which org is
// selected at a glance.
export function useOrgOptions(): OrgOption[] {
  const { data: orgs } = useCachedPromise(listOrgs, [], { keepPreviousData: true });
  const { data: metadata } = useCachedPromise(getAllOrgMetadata, [], { keepPreviousData: true });

  return (orgs ?? []).map((org) => ({
    value: org.alias || org.username,
    title: metadata?.[org.username]?.label || org.alias || org.username,
    icon: { source: Icon.Cloud, tintColor: metadata?.[org.username]?.color || DEFAULT_ORG_COLOR },
  }));
}

export function OrgListDropdown({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = useOrgOptions();

  return (
    <List.Dropdown tooltip="Select Org" storeValue value={value} onChange={onChange}>
      <List.Dropdown.Item key="none" value="" title="Select an org..." icon={Icon.Cloud} />
      {options.map((option) => (
        <List.Dropdown.Item key={option.value} value={option.value} title={option.title} icon={option.icon} />
      ))}
    </List.Dropdown>
  );
}
