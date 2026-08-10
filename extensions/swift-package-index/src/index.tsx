import { ActionPanel, Action, List } from "@raycast/api";
import { PackageInfo } from "./models";
import { useSearch } from "./search";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={(query) => {
        search(query, 1);
      }}
      onSelectionChange={(id) => {
        const guard = !(state.result.hasMoreItems && typeof id !== "undefined" && id != null);
        if (guard) return;

        const to = state.result.items.length;
        const candidates = state.result.items.slice(-3, to);
        const condition = candidates.find((manifest) => {
          return manifest.id === id;
        });
        if (condition) search(state.query, state.lastPage + 1);
      }}
      searchBarPlaceholder="Search Swift Packages..."
      throttle
    >
      <List.Section title="Results" subtitle={state.result.items.length + ""}>
        {state.result.items.map((manifest) => (
          <PackageListItem key={manifest.id} manifest={manifest} />
        ))}
      </List.Section>
    </List>
  );
}

function PackageListItem({ manifest }: { manifest: PackageInfo }) {
  return (
    <List.Item
      id={manifest.id}
      title={manifest.name || manifest.repositoryName}
      subtitle={manifest.description}
      accessoryTitle={manifest.username}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Swift Package Index">
            <Action.OpenInBrowser title="Open SPI Page" url={manifest.spiURL} />
            <Action.OpenInBrowser title="Open Author SPI Page" url={manifest.authorSPIURL} />
          </ActionPanel.Section>
          <ActionPanel.Section title="GitHub">
            <Action.OpenInBrowser
              title="Open GitHub Repo"
              url={manifest.githubURL}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
            />
            <Action.OpenInBrowser
              title="Open Author Github Page"
              url={manifest.authorGithubURL}
              shortcut={{ modifiers: ["opt", "cmd"], key: "enter" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
