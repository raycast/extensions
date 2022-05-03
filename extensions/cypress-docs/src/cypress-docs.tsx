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
  Guides: [
    {
      url: "https://docs.cypress.io/guides/guides/command-line",
      title: "Command Line",
    },
    {
      url: "https://docs.cypress.io/guides/guides/module-api",
      title: "Module API",
    },
    {
      url: "https://docs.cypress.io/guides/guides/debugging",
      title: "Debugging",
    },
    {
      url: "https://docs.cypress.io/guides/guides/network-requests",
      title: "Network Requests",
    },
    {
      url: "https://docs.cypress.io/guides/guides/test-retries",
      title: "Test Retries",
    },
    {
      url: "https://docs.cypress.io/guides/guides/parallelization",
      title: "Parallelization",
    },
    {
      url: "https://docs.cypress.io/guides/guides/environment-variables",
      title: "Environment Variables",
    },
    {
      url: "https://docs.cypress.io/guides/guides/stubs-spies-and-clocks",
      title: "Stubs, Spies, and Clocks",
    },
    {
      url: "https://docs.cypress.io/guides/guides/screenshots-and-videos",
      title: "Screenshots and Videos",
    },
    {
      url: "https://docs.cypress.io/guides/guides/launching-browsers",
      title: "Launching Browsers",
    },
    {
      url: "https://docs.cypress.io/guides/guides/cross-browser-testing",
      title: "Cross Browser Testing",
    },
    {
      url: "https://docs.cypress.io/guides/guides/web-security",
      title: "Web Security",
    },
  ],
  "Testing Strategiess": [
    {
      url: "https://docs.cypress.io/guides/testing-strategies/auth0-authentication",
      title: "Auth0 Authentication",
    },
    {
      url: "https://docs.cypress.io/guides/testing-strategies/amazon-cognito-authentication",
      title: "Amazon Cognito Authentication",
    },
    {
      url: "https://docs.cypress.io/guides/testing-strategies/okta-authentication",
      title: "Okta Authentication",
    },
    {
      url: "https://docs.cypress.io/guides/testing-strategies/google-authentication",
      title: "Google Authentication",
    },
    {
      url: "https://docs.cypress.io/guides/testing-strategies/working-with-graphql",
      title: "Working with GraphQL",
    },
  ],
  "Continuous Integration": [
    {
      url: "https://docs.cypress.io/guides/continuous-integration/introduction",
      title: "Introduction",
    },
    {
      url: "https://docs.cypress.io/guides/continuous-integration/ci-provider-examples",
      title: "CI Provider Examples",
    },
    {
      url: "https://docs.cypress.io/guides/continuous-integration/circleci",
      title: "CircleCI",
    },
    {
      url: "https://docs.cypress.io/guides/continuous-integration/github-actions",
      title: "GitHub Actions",
    },
    {
      url: "https://docs.cypress.io/guides/continuous-integration/gitlab-ci",
      title: "GitLab CI",
    },
    {
      url: "https://docs.cypress.io/guides/continuous-integration/bitbucket-pipelines",
      title: "Bitbucket Pipelines",
    },
    {
      url: "https://docs.cypress.io/guides/continuous-integration/aws-codebuild",
      title: "AWS CodeBuild",
    },
  ],
  "Component Testing": [
    {
      url: "https://docs.cypress.io/guides/component-testing/introduction",
      title: "Introduction",
    },
    {
      url: "https://docs.cypress.io/guides/component-testing/framework-configuration",
      title: "Framework Configuration",
    },
  ],
  "Migrating to Cypress": [
    {
      url: "https://docs.cypress.io/guides/migrating-to-cypress/protractor",
      title: "Protractor",
    },
  ],
};
