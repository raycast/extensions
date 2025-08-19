import { List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export default function Command() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { "Session Token": sessionToken } = getPreferenceValues();

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const res = await fetch("https://logggai.run/api/organizations", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        const data = (await res.json()) as { organizations?: Organization[] };
        setOrgs(data.organizations || []);
      } catch {
        showToast({ style: Toast.Style.Failure, title: "Failed to fetch organizations" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrgs();
  }, [sessionToken]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search organizations...">
      {orgs.map((org) => (
        <List.Item key={org.id} title={org.name} subtitle={`${org.slug} (${org.role})`} />
      ))}
    </List>
  );
}
