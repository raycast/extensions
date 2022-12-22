import { Icon, Color, MenuBarExtra, open, Keyboard } from "@raycast/api";
import useVercel from "../../hooks/use-vercel-info";
import fromNow from "../../utils/time";
import { Deployment, DeploymentState } from "../../types";
import { FetchHeaders, getFetchDeploymentsURL } from "../../vercel";
import { useFetch } from "@raycast/utils";
import MenuBarTeamAccessory from "../search-projects/team-switch-menubar-accessory";

interface StateStyles extends Record<DeploymentState, { icon: string; color: string }> {
  undefined: { icon: string; color: string };
}

const stateStyles: StateStyles = {
  READY: {
    icon: Icon.CheckCircle,
    color: Color.Green,
  },
  BUILDING: {
    icon: Icon.Bolt,
    color: Color.Yellow,
  },
  INITIALIZING: {
    icon: Icon.BoltDisabled,
    color: Color.Yellow,
  },
  FAILED: {
    icon: Icon.ExclamationMark,
    color: Color.Red,
  },
  CANCELED: {
    icon: Icon.MinusCircleFilled,
    color: Color.Red,
  },
  ERROR: {
    icon: Icon.Warning,
    color: Color.Red,
  },
  QUEUED: {
    icon: Icon.List,
    color: Color.Purple,
  },
  undefined: {
    icon: Icon.Dot,
    color: Color.PrimaryText,
  },
};

const seperator = "·";
const newline = "\n";
const numShow = 12;

const MenuBarDeployments = ({ projectId }: { projectId?: string }) => {
  const { user, selectedTeam } = useVercel();
  const url = getFetchDeploymentsURL(selectedTeam?.id, projectId);

  const { isLoading, data, revalidate } = useFetch<{
    deployments: Deployment[];
    // TODO: why can't I `{ headers: FetchHeaders }` here?
  }>(url, {
    // @ts-expect-error Type 'null' is not assignable to type 'string'.
    headers: FetchHeaders.get("Authorization") ? [["Authorization", FetchHeaders.get("Authorization")]] : [[]],
  });

  const deployments = data?.deployments;

  const onTeamChange = () => {
    revalidate();
  };

  const mostRecentDeploymentState = deployments?.[0]?.state || "undefined";

  return (
    <MenuBarExtra
      icon={{
        source: "../assets/vercel.svg",
        tintColor:
          mostRecentDeploymentState === "READY" // If the most recent deployment state is READY change the tint to white or dark depending on system theme
            ? { light: "000000", dark: "FFFFFF" }
            : stateStyles[mostRecentDeploymentState].color,
      }}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="Deployments">
        {deployments?.slice(0, numShow).map((deployment, index) => {
          const state = deployment.state || "undefined";
          const branchName = getCommitDeploymentBranch(deployment);
          const deploymentName = !projectId ? `${deployment.name}` : "";
          const commitMessage = getCommitMessage(deployment);
          const commitMessageTruncated = truncator(commitMessage, 30);
          const deploymentDateFromNow = deployment.createdAt ? fromNow(deployment.createdAt, new Date()) : "";
          return (
            <MenuBarExtra.Item
              title={commitMessageTruncated}
              subtitle={`${seperator} ${deploymentDateFromNow}${newline}${deploymentName} ${seperator} ${branchName}`}
              shortcut={
                index < 9
                  ? {
                      modifiers: ["cmd"],
                      key: (index + 1).toString() as Keyboard.KeyEquivalent,
                    }
                  : undefined
              }
              icon={{
                source: stateStyles[state].icon,
                tintColor: stateStyles[state].color,
              }}
              tooltip={
                (deployment.createdAt ? new Date(deployment.createdAt).toLocaleString() : "") + newline + commitMessage
              }
              onAction={() => open(`https://${deployment.url}`)}
              key={deployment.uid}
            />
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarTeamAccessory onTeamChange={onTeamChange} />
        {/* // TODO: add submenu for projects
         <MenuBarExtra.Submenu
          title={`${selectedTeam?.name ?? "All Projects"}`}
          icon={Icon.AppWindowGrid3x3}
        >
          <MenuBarExtra.Item
            title="All Projects"
            icon={{ source: Icon.Dot, tintColor: Color.Green }}
            onAction={() => open("https://vercel.com/bruceg")}
          />
          <MenuBarExtra.Item
            title="project 1"
            icon={Icon.Dot}
            onAction={() => open("https://")}
          />
        </MenuBarExtra.Submenu>
      </MenuBarExtra.Section>
      <MenuBarExtra.Section> */}
        <MenuBarExtra.Item title="Refresh" onAction={revalidate} icon={Icon.RotateClockwise} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
};

export default MenuBarDeployments;

const truncator = (str: string, length: number) => {
  if (str.length > length) {
    return str.replace(/\n/g, "").substring(0, length) + "…";
  }
  return str;
};

const getCommitMessage = (deployment: Deployment) => {
  // TODO: determine others
  if (deployment.meta.githubCommitMessage) {
    return deployment.meta.githubCommitMessage;
  }
  return "No commit message";
};

const getCommitDeploymentBranch = (deployment: Deployment) => {
  // TODO: support other providers beside GitHub
  return deployment.meta.githubCommitRef ?? null;
};
