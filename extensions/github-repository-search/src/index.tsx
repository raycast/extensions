import {
  ActionPanel,
  CopyToClipboardAction,
  environment,
  Icon,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useState } from "react";
import { Repository } from "./types";
import { useRepositories } from "./useRepositories";
import { clearVisitedRepositories, useVisitedRepositories } from "./useVisitedRepositories";
import { getAccessoryTitle, getIcon, getSubtitle } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { repositories, error, isLoading: isLoadingRepositories } = useRepositories(searchText);
  const {
    repositories: visitedRepositories,
    visitRepository,
    isLoading: isLoadingVisitedRepositories,
  } = useVisitedRepositories();

  if (error) {
    showToast(
      ToastStyle.Failure,
      "Failed searching repositories",
      error instanceof Error ? error.message : String(error)
    );
  }

  return (
    <List isLoading={isLoadingVisitedRepositories || isLoadingRepositories} onSearchTextChange={setSearchText}>
      <List.Section
        title="Visited Repositories"
        subtitle={visitedRepositories ? String(visitedRepositories.length) : undefined}
      >
        {visitedRepositories
          ?.filter((r) => r.full_name.includes(searchText ?? ""))
          .map((repository) => (
            <RepositoryListItem key={repository.id} repository={repository} onVisit={visitRepository} />
          ))}
      </List.Section>
      <List.Section title="Found Repositories">
        {repositories?.map((repository) => (
          <RepositoryListItem key={repository.id} repository={repository} onVisit={visitRepository} />
        ))}
      </List.Section>
    </List>
  );
}

function RepositoryListItem(props: { repository: Repository; onVisit: (repository: Repository) => void }) {
  return (
    <List.Item
      icon={getIcon(props.repository)}
      title={props.repository.full_name}
      subtitle={getSubtitle(props.repository)}
      accessoryTitle={getAccessoryTitle(props.repository)}
      actions={<Actions repository={props.repository} onVisit={props.onVisit} />}
    />
  );
}

function Actions(props: { repository: Repository; onVisit: (repository: Repository) => void }) {
  return (
    <ActionPanel title={props.repository.full_name}>
      <ActionPanel.Section>
        <OpenInBrowserAction url={props.repository.html_url} onOpen={() => props.onVisit(props.repository)} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <OpenInBrowserAction
          title="Open Pull Requests"
          url={`${props.repository.html_url}/pulls`}
          shortcut={{ modifiers: ["cmd"], key: "p" }}
          onOpen={() => props.onVisit(props.repository)}
        />
        {props.repository.has_issues && (
          <OpenInBrowserAction
            title="Open Issues"
            url={`${props.repository.html_url}/issues`}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onOpen={() => props.onVisit(props.repository)}
          />
        )}
        {props.repository.has_wiki && (
          <OpenInBrowserAction
            title="Open Wiki"
            url={`${props.repository.html_url}/wiki`}
            shortcut={{ modifiers: ["cmd"], key: "w" }}
            onOpen={() => props.onVisit(props.repository)}
          />
        )}
        {props.repository.has_downloads && (
          <OpenInBrowserAction
            title="Open Downloads"
            url={`${props.repository.html_url}/downloads`}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onOpen={() => props.onVisit(props.repository)}
          />
        )}
        {props.repository.has_pages && (
          <OpenInBrowserAction
            title="Open Pages"
            url={`${props.repository.html_url}/pages`}
            shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
            onOpen={() => props.onVisit(props.repository)}
          />
        )}
        {props.repository.has_projects && (
          <OpenInBrowserAction
            title="Open Projects"
            url={`${props.repository.html_url}/projects`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onOpen={() => props.onVisit(props.repository)}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <CopyToClipboardAction
          title="Copy Repository URL"
          content={props.repository.html_url}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        <CopyToClipboardAction
          title="Copy Name with Owner"
          content={props.repository.full_name}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
        <CopyToClipboardAction
          title="Copy Clone Command"
          content={`git clonse ${props.repository.html_url}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />
      </ActionPanel.Section>
      <DevelopmentActionSection />
    </ActionPanel>
  );
}

function DevelopmentActionSection() {
  async function handleClearVisitedRepositories() {
    const toast = await showToast(ToastStyle.Animated, "Clearing visted repositories");

    try {
      await clearVisitedRepositories();
      toast.style = ToastStyle.Success;
      toast.title = "Cleared visited repositories";
    } catch (error) {
      toast.style = ToastStyle.Failure;
      toast.title = "Failed clearing visited repositories";
      toast.message = error instanceof Error ? error.message : undefined;
      console.error("Failed clearing visited repositories", error);
    }
  }

  return environment.isDevelopment ? (
    <ActionPanel.Section title="Development">
      <ActionPanel.Item
        icon={Icon.Trash}
        title="Clear Visited Repositories"
        onAction={handleClearVisitedRepositories}
      />
    </ActionPanel.Section>
  ) : null;
}
