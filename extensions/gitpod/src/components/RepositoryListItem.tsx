import {
  Color,
  List,
  ActionPanel,
  Action,
  open,
  useNavigation,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
} from "@raycast/api";
import { MutatePromise, usePromise } from "@raycast/utils";

import { GitpodIcons, UIColors } from "../../constants";
import { WorkspaceManager } from "../api/Gitpod/WorkspaceManager";
import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";
import createWorksapceFromContext from "../helpers/createWorkspaceFromContext";
import OpenInGitpod, { getPreferencesForContext } from "../helpers/openInGitpod";
import { getGitHubUser } from "../helpers/users";
import SearchContext from "../open_repo_context";
import { dashboardPreferences } from "../preferences/dashboard_preferences";
import RepositoryPreference from "../preferences/repository_preferences";

import DefaultOrgForm from "./DefaultOrgForm";

type RepositoryListItemProps = {
  repository: ExtendedRepositoryFieldsFragment;
  isGitpodified: boolean;
  onVisit: (repository: ExtendedRepositoryFieldsFragment) => void;
  removeRepository?: (repository: ExtendedRepositoryFieldsFragment) => Promise<void>;
  mutateList: MutatePromise<ExtendedRepositoryFieldsFragment[] | undefined>;
  fromCache?: boolean;
};

export default function RepositoryListItem({
  repository,
  isGitpodified,
  onVisit,
  fromCache,
  removeRepository,
}: RepositoryListItemProps) {
  const { push } = useNavigation();
  const owner = getGitHubUser(repository.owner);
  const numberOfStars = repository.stargazerCount;
  const dashboardPreferences = getPreferenceValues<dashboardPreferences>();

  const { data: preferences, revalidate } = usePromise(async () => {
    const response = await getPreferencesForContext("Repository", repository.nameWithOwner);
    return response;
  });

  const accessories: List.Item.Accessory[] = [
    {
      text: {
        value: preferences?.preferredEditorClass === "g1-large" ? "L" : "S",
      },
      icon: {
        source: Icon.ComputerChip,
        tintColor: UIColors.gitpod_gold,
      },
      tooltip: `Editor: ${preferences?.preferredEditor}, Class: ${preferences?.preferredEditorClass} `,
    },
    {
      icon: isGitpodified ? GitpodIcons.gitpod_logo_primary : GitpodIcons.gitpod_logo_secondary,
    },
  ];

  accessories.unshift(
    {
      text: {
        value: repository.issues?.totalCount.toString(),
      },
      icon: GitpodIcons.issues_icon,
    },
    {
      text: {
        value: repository.pullRequests?.totalCount.toString(),
      },
      icon: GitpodIcons.pulls_icon,
    }
  );

  if (repository.latestRelease?.tagName) {
    accessories.unshift({
      tag: {
        value: repository.latestRelease.tagName,
        color: Color.Green,
      },
      icon: GitpodIcons.tag_icon,
    });
  }

  return (
    <List.Item
      icon={owner.icon}
      title={repository.name}
      {...(numberOfStars > 0
        ? {
            subtitle: {
              value: `${numberOfStars}`,
              tooltip: `Number of Stars: ${numberOfStars}`,
            },
          }
        : {})}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Get In"
            onAction={() => {
              onVisit(repository);
              push(<SearchContext repository={repository} />);
            }}
          />
          <Action
            title="Open Repo in GitHub"
            onAction={() => {
              onVisit(repository);
              open(repository.url);
            }}
          />
          {!fromCache && (
            <Action
              title="Add Repo to Recents"
              onAction={async () => {
                onVisit(repository);
                await showToast({
                  title: `Added "${repository.nameWithOwner}" to Recents`,
                  style: Toast.Style.Success,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          {fromCache && (
            <Action
              title="Remove from Recents"
              onAction={async () => {
                await showToast({
                  title: `Removing "${repository.nameWithOwner}" from Recents`,
                  style: Toast.Style.Animated,
                });
                await removeRepository?.(repository);
                await showToast({
                  title: `Removed "${repository.nameWithOwner}" from Recents`,
                  style: Toast.Style.Success,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          )}
          <Action
            title="Trigger Workspace"
            onAction={async () => {
              onVisit(repository);
              if (dashboardPreferences.access_token) {
                const defaultOrg = await LocalStorage.getItem("default_organization");
                if (defaultOrg !== undefined && WorkspaceManager.api) {
                  createWorksapceFromContext(defaultOrg.toString(), repository.url);
                } else {
                  push(<DefaultOrgForm />);
                }
              } else {
                OpenInGitpod(repository.url, "Repository", repository.nameWithOwner);
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
          {/* <Action
            title="Configure Workspace"
            onAction={() =>
              push(<RepositoryPreference revalidate={revalidate} repository={repository.nameWithOwner} />)
            }
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          /> */}
          <Action.Push
            title="Switch Default Organization"
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            target={<DefaultOrgForm />}
          />
        </ActionPanel>
      }
    />
  );
}
