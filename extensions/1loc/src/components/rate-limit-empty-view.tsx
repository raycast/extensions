import { Action, ActionPanel, List } from "@raycast/api"

const RateLimitEmptyView = () => (
  <List.EmptyView
    icon="empty-view.png"
    title="GitHub API rate limit exceeded"
    description={`Check out the documentation for details on how to generate a Personal Access Token, then update the extension's configuration.\nAlternatively, try again later.`}
    actions={
      <ActionPanel>
        <Action.OpenInBrowser
          title="Open Documentation"
          url="https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting"
        />
      </ActionPanel>
    }
  />
)

export default RateLimitEmptyView
