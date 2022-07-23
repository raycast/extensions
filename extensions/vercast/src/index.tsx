import {
  render,
  ActionPanel,
  PushAction,
  Color,
  Icon,
  List,
  OpenInBrowserAction,
  preferences,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { randomUUID } from "crypto";
import { useEffect, useState } from "react";
import useInterval from "./use-interval";
import { Deployment, DeploymentState, fetchDeployments, fetchTeams, fetchUsername, Team } from "./vercel";

import { UpdateEnvironmentVariable } from "./actions";

render(<Main />);

function Main(): JSX.Element {
  // Get preference values
  const token = String(preferences.token.value);
  if (token.length !== 24) {
    showToast(ToastStyle.Failure, "Invalid token detected");
    throw new Error("Invalid token length detected");
  }

  // Setup useState objects
  const [username, setUsername] = useState("");
  const [deployments, setDeployments] = useState<Deployment[]>();
  const [teams, setTeams] = useState<Team[]>();
  useEffect(() => {
    const ignoredTeamIDs = String(preferences.ignoredTeams.value ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== "");
    const fetchData = async () => {
      const [fetchedUsername, fetchedTeams] = await Promise.all([fetchUsername(), fetchTeams(ignoredTeamIDs)]);
      const fetchedDeployments = await fetchDeployments(fetchedUsername, fetchedTeams);
      setUsername(fetchedUsername);
      setTeams(fetchedTeams);
      setDeployments(fetchedDeployments);
    };
    fetchData();
  }, []);

  // Refresh deployments every 2 seconds
  useInterval(async () => {
    if (username && teams) {
      setDeployments(await fetchDeployments(username, teams));
    }
  }, 8000);

  return (
    <List isLoading={!deployments}>
      {deployments?.map((d) => {
        let iconSource = Icon.Globe;
        let iconTintColor = Color.PrimaryText;
        switch (d.state) {
          case DeploymentState.ready:
            iconSource = Icon.Checkmark;
            iconTintColor = Color.Green;
            break;
          case DeploymentState.deploying:
            iconSource = Icon.Hammer;
            iconTintColor = Color.Yellow;
            break;
          case DeploymentState.failed:
            iconSource = Icon.XmarkCircle;
            iconTintColor = Color.Red;
            break;
          case DeploymentState.canceled:
            iconSource = Icon.XmarkCircle;
            iconTintColor = Color.SecondaryText;
            break;
        }
        const randomID = randomUUID();
        return (
          <List.Item
            key={d.id + randomID}
            id={d.id + randomID}
            title={(d.owner === username ? "" : `${d.owner}/`) + d.project}
            subtitle={d.domain}
            accessoryTitle={d.timeSince}
            icon={{ tintColor: iconTintColor, source: iconSource }}
            actions={
              <ActionPanel>
                <ActionPanel.Section title={(d.owner === username ? "" : `${d.owner}/`) + d.project}>
                  <OpenInBrowserAction url={d.url} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Project Settings">
                  <PushAction
                    icon={Icon.Gear}
                    title="Environment Variable"
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={
                      <UpdateEnvironmentVariable
                        projectId={d.project}
                        projectName={(d.owner === username ? "" : `${d.owner}/`) + d.project}
                      />
                    }
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
