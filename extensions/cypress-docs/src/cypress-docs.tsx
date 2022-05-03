import { ActionPanel, List, Action } from "@raycast/api";

export default function SearchDocumentation() {
  return (
    <List>
      {Object.entries(documentation).map(([section, items]) => (
        <List.Section title={section} key={section}>
          {items.map((item) => (
            <List.Item
              key={item.url}
              icon="cypress-logo.png"
              title={item.title}
              keywords={[item.title, section]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url} />
                  <Action.CopyToClipboard title="Copy URL" content={item.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

const documentation = {
  Overview: [
    {
      url: "https://docs.cypress.io/guides/overview/why-cypress",
      title: "Why Cypress?",
    },
    {
      url: "https://docs.cypress.io/guides/overview/key-differences",
      title: "Key Differences",
    },
  ],
  "Getting Started": [
    {
      url: "https://docs.cypress.io/guides/getting-started/installing-cypress",
      title: "Installing Cypress",
    },
    {
      url: "https://docs.cypress.io/guides/getting-started/writing-your-first-test",
      title: "Writing Your First Test",
    },
    {
      url: "https://docs.cypress.io/guides/getting-started/testing-your-app",
      title: "Testing Your App",
    },
  ],
  "Core Concepts": [
    {
      url: "https://docs.cypress.io/guides/core-concepts/introduction-to-cypress",
      title: "Introduction to Cypress",
    },
    {
      url: "https://docs.cypress.io/guides/core-concepts/writing-and-organizing-tests",
      title: "Writing and Organizing Tests",
    },
    {
      url: "https://docs.cypress.io/guides/core-concepts/retry-ability",
      title: "Rety-ability",
    },
    {
      url: "https://docs.cypress.io/guides/core-concepts/interacting-with-elements",
      title: "Interacting with Elements",
    },
    {
      url: "https://docs.cypress.io/guides/core-concepts/variables-and-aliases",
      title: "Variables and Aliases",
    },
    {
      url: "https://docs.cypress.io/guides/core-concepts/conditional-testing",
      title: "Conditional Testing",
    },
    {
      url: "https://docs.cypress.io/guides/core-concepts/test-runner",
      title: "The Test Runner",
    },
    {
      url: "https://docs.cypress.io/guides/core-concepts/cypress-studio",
      title: "Cypress Studio",
    },
  ],
  Dashboard: [
    {
      url: "https://docs.cypress.io/guides/dashboard/introduction",
      title: "Introduction",
    },
    {
      url: "https://docs.cypress.io/guides/dashboard/projects",
      title: "Projects",
    },
    {
      url: "https://docs.cypress.io/guides/dashboard/runs",
      title: "Runs",
    },
    {
      url: "https://docs.cypress.io/guides/dashboard/organizations",
      title: "Organizations",
    },
    {
      url: "https://docs.cypress.io/guides/dashboard/users",
      title: "Users",
    },
    {
      url: "https://docs.cypress.io/guides/dashboard/bitbucket-integration",
      title: "Bitbucket Integration",
    },
    {
      url: "https://docs.cypress.io/guides/dashboard/github-integration",
      title: "GitHub Integration",
    },
    {
      url: "https://docs.cypress.io/guides/dashboard/gitlab-integration#Installing-the-GitLab-integration",
      title: "GitLab Integration",
    },
    {
      url: "https://docs.cypress.io/guides/dashboard/jira-integration",
      title: "Jira Integration",
    },
    {
      url: "https://docs.cypress.io/guides/dashboard/slack-integration",
      title: "Slack Integration",
    },
    {
      url: "https://docs.cypress.io/guides/dashboard/analytics",
      title: "Analytics",
    },
    {
      url: "https://docs.cypress.io/guides/dashboard/flaky-test-management",
      title: "Flaky Test Management",
    },
    {
      url: "https://docs.cypress.io/guides/dashboard/smart-orchestration",
      title: "Smart Orchestration",
    },
  ],
};
