import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import type { MakeClient } from "./make-api";
import { presentMakeApiError } from "./make-api";
import { setSelection } from "./storage";
import type {
  ListOrganizationsResponse,
  ListTeamsResponse,
  MakeOrganization,
  MakeTeam,
} from "./types";

type Props = {
  client: MakeClient;
  onDone: () => void;
};

export function SelectOrgTeam(props: Props) {
  const [step, setStep] = useState<"org" | "team">("org");
  const [isLoading, setIsLoading] = useState(true);

  const [orgs, setOrgs] = useState<MakeOrganization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<MakeOrganization | null>(null);
  const [teams, setTeams] = useState<MakeTeam[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadOrgs() {
      setIsLoading(true);
      try {
        const res = await props.client.getJson<ListOrganizationsResponse>(
          "/api/v2/organizations",
          {
            "pg[limit]": 10000,
            "pg[sortBy]": "name",
            "pg[sortDir]": "asc",
          },
        );
        if (cancelled) return;
        setOrgs(res.organizations ?? []);
      } catch (e) {
        if (cancelled) return;
        await presentMakeApiError(e, "Failed to load organizations");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadOrgs();

    return () => {
      cancelled = true;
    };
  }, [props.client]);

  async function chooseOrg(org: MakeOrganization) {
    setSelectedOrg(org);
    setStep("team");
    setIsLoading(true);

    try {
      const res = await props.client.getJson<ListTeamsResponse>(
        "/api/v2/teams",
        {
          organizationId: org.id,
          "pg[limit]": 10000,
          "pg[sortBy]": "name",
          "pg[sortDir]": "asc",
        },
      );
      setTeams(res.teams ?? []);
    } catch (e) {
      await presentMakeApiError(e, "Failed to load teams");
      setStep("org");
      setSelectedOrg(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function chooseTeam(team: MakeTeam) {
    if (!selectedOrg) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select an organization first",
      });
      return;
    }

    await setSelection({
      organizationId: selectedOrg.id,
      organizationName: selectedOrg.name,
      teamId: team.id,
      teamName: team.name,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Selected Make team",
      message: `${selectedOrg.name} → ${team.name}`,
    });
    props.onDone();
  }

  if (step === "org") {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Search organizations…">
        {orgs.map((org) => (
          <List.Item
            key={org.id}
            title={org.name}
            subtitle={`Org ID: ${org.id}`}
            actions={
              <ActionPanel>
                <Action
                  title="Select Organization"
                  onAction={() => void chooseOrg(org)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search teams…">
      <List.Item
        title={selectedOrg?.name ?? "Organization"}
        subtitle="Change organization"
        actions={
          <ActionPanel>
            <Action
              title="Back to Organizations"
              onAction={() => {
                setTeams([]);
                setSelectedOrg(null);
                setStep("org");
              }}
            />
          </ActionPanel>
        }
      />

      {teams.map((team) => (
        <List.Item
          key={team.id}
          title={team.name}
          subtitle={`Team ID: ${team.id}`}
          actions={
            <ActionPanel>
              <Action
                title="Select Team"
                onAction={() => void chooseTeam(team)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
