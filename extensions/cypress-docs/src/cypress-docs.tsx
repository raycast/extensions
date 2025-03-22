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
      title: "Retry-ability",
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
  Tooling: [
    {
      url: "https://docs.cypress.io/guides/tooling/IDE-integration",
      title: "IDE Integration",
    },
    {
      url: "https://docs.cypress.io/guides/tooling/plugins-guide",
      title: "Plugins",
    },
    {
      url: "https://docs.cypress.io/guides/tooling/reporters",
      title: "Reporters",
    },
    {
      url: "https://docs.cypress.io/guides/tooling/typescript-support",
      title: "TypeScript",
    },
    {
      url: "https://docs.cypress.io/guides/tooling/visual-testing",
      title: "Visual Testing",
    },
    {
      url: "https://docs.cypress.io/guides/tooling/code-coverage",
      title: "Code Coverage",
    },
  ],
  References: [
    {
      url: "https://docs.cypress.io/guides/references/assertions",
      title: "Assertions",
    },
    {
      url: "https://docs.cypress.io/guides/references/configuration",
      title: "Configuration",
    },
    {
      url: "https://docs.cypress.io/guides/references/client-certificates",
      title: "Client Certificates",
    },
    {
      url: "https://docs.cypress.io/guides/references/proxy-configuration",
      title: "Proxy Configuration",
    },
    {
      url: "https://docs.cypress.io/guides/references/best-practices",
      title: "Best Practices",
    },
    {
      url: "https://docs.cypress.io/guides/references/error-messages",
      title: "Error Messages",
    },
    {
      url: "https://docs.cypress.io/guides/references/bundled-tools",
      title: "Bundled Tools",
    },
    {
      url: "https://docs.cypress.io/guides/references/trade-offs",
      title: "Trade-offs",
    },
    {
      url: "https://docs.cypress.io/guides/references/troubleshooting",
      title: "Troubleshooting",
    },
    {
      url: "https://docs.cypress.io/guides/references/changelog",
      title: "Changelog",
    },
    {
      url: "https://docs.cypress.io/guides/references/migration-guide",
      title: "Migration Guide",
    },
    {
      url: "https://docs.cypress.io/guides/references/experiments",
      title: "Experiments",
    },
  ],
  Events: [
    {
      url: "https://docs.cypress.io/api/events/catalog-of-events",
      title: "Catalog of Events",
    },
  ],
  Commands: [
    {
      title: "and",
      url: "https://docs.cypress.io/api/commands/and",
    },
    {
      title: "as",
      url: "https://docs.cypress.io/api/commands/as",
    },
    {
      title: "blur",
      url: "https://docs.cypress.io/api/commands/blur",
    },
    {
      title: "check",
      url: "https://docs.cypress.io/api/commands/check",
    },
    {
      title: "children",
      url: "https://docs.cypress.io/api/commands/children",
    },
    {
      title: "clear",
      url: "https://docs.cypress.io/api/commands/clear",
    },
    {
      title: "clearCookie",
      url: "https://docs.cypress.io/api/commands/clearcookie",
    },
    {
      title: "clearCookies",
      url: "https://docs.cypress.io/api/commands/clearcookies",
    },
    {
      title: "clearLocalStorage",
      url: "https://docs.cypress.io/api/commands/clearlocalstorage",
    },
    {
      title: "click",
      url: "https://docs.cypress.io/api/commands/click",
    },
    {
      title: "clock",
      url: "https://docs.cypress.io/api/commands/clock",
    },
    {
      title: "closest",
      url: "https://docs.cypress.io/api/commands/closest",
    },
    {
      title: "contains",
      url: "https://docs.cypress.io/api/commands/contains",
    },
    {
      title: "dblclick",
      url: "https://docs.cypress.io/api/commands/dblclick",
    },
    {
      title: "debug",
      url: "https://docs.cypress.io/api/commands/debug",
    },
    {
      title: "document",
      url: "https://docs.cypress.io/api/commands/document",
    },
    {
      title: "each",
      url: "https://docs.cypress.io/api/commands/each",
    },
    {
      title: "end",
      url: "https://docs.cypress.io/api/commands/end",
    },
    {
      title: "eq",
      url: "https://docs.cypress.io/api/commands/eq",
    },
    {
      title: "exec",
      url: "https://docs.cypress.io/api/commands/exec",
    },
    {
      title: "filter",
      url: "https://docs.cypress.io/api/commands/filter",
    },
    {
      title: "find",
      url: "https://docs.cypress.io/api/commands/find",
    },
    {
      title: "first",
      url: "https://docs.cypress.io/api/commands/first",
    },
    {
      title: "fixture",
      url: "https://docs.cypress.io/api/commands/fixture",
    },
    {
      title: "focus",
      url: "https://docs.cypress.io/api/commands/focus",
    },
    {
      title: "focused",
      url: "https://docs.cypress.io/api/commands/focused",
    },
    {
      title: "get",
      url: "https://docs.cypress.io/api/commands/get",
    },
    {
      title: "getCookie",
      url: "https://docs.cypress.io/api/commands/getcookie",
    },
    {
      title: "getCookies",
      url: "https://docs.cypress.io/api/commands/getcookies",
    },
    {
      title: "go",
      url: "https://docs.cypress.io/api/commands/go",
    },
    {
      title: "hash",
      url: "https://docs.cypress.io/api/commands/hash",
    },
    {
      title: "hover",
      url: "https://docs.cypress.io/api/commands/hover",
    },
    {
      title: "intercept",
      url: "https://docs.cypress.io/api/commands/intercept",
    },
    {
      title: "invoke",
      url: "https://docs.cypress.io/api/commands/invoke",
    },
    {
      title: "its",
      url: "https://docs.cypress.io/api/commands/its",
    },
    {
      title: "last",
      url: "https://docs.cypress.io/api/commands/last",
    },
    {
      title: "location",
      url: "https://docs.cypress.io/api/commands/location",
    },
    {
      title: "log",
      url: "https://docs.cypress.io/api/commands/log",
    },
    {
      title: "next",
      url: "https://docs.cypress.io/api/commands/next",
    },
    {
      title: "nextAll",
      url: "https://docs.cypress.io/api/commands/nextall",
    },
    {
      title: "nextUntil",
      url: "https://docs.cypress.io/api/commands/nextuntil",
    },
    {
      title: "not",
      url: "https://docs.cypress.io/api/commands/not",
    },
    {
      title: "origin",
      url: "https://docs.cypress.io/api/commands/origin",
    },
    {
      title: "parent",
      url: "https://docs.cypress.io/api/commands/parent",
    },
    {
      title: "parents",
      url: "https://docs.cypress.io/api/commands/parents",
    },
    {
      title: "parentsUntil",
      url: "https://docs.cypress.io/api/commands/parentsuntil",
    },
    {
      title: "pause",
      url: "https://docs.cypress.io/api/commands/pause",
    },
    {
      title: "prev",
      url: "https://docs.cypress.io/api/commands/prev",
    },
    {
      title: "prevAll",
      url: "https://docs.cypress.io/api/commands/prevall",
    },
    {
      title: "prevUntil",
      url: "https://docs.cypress.io/api/commands/prevuntil",
    },
    {
      title: "readFile",
      url: "https://docs.cypress.io/api/commands/readfile",
    },
    {
      title: "reload",
      url: "https://docs.cypress.io/api/commands/reload",
    },
    {
      title: "request",
      url: "https://docs.cypress.io/api/commands/request",
    },
    {
      title: "rightclick",
      url: "https://docs.cypress.io/api/commands/rightclick",
    },
    {
      title: "root",
      url: "https://docs.cypress.io/api/commands/root",
    },
    {
      title: "route",
      url: "https://docs.cypress.io/api/commands/route",
    },
    {
      title: "screenshot",
      url: "https://docs.cypress.io/api/commands/screenshot",
    },
    {
      title: "scrollIntoView",
      url: "https://docs.cypress.io/api/commands/scrollintoview",
    },
    {
      title: "scrollTo",
      url: "https://docs.cypress.io/api/commands/scrollto",
    },
    {
      title: "select",
      url: "https://docs.cypress.io/api/commands/select",
    },
    {
      title: "selectFile",
      url: "https://docs.cypress.io/api/commands/selectfile",
    },
    {
      title: "server",
      url: "https://docs.cypress.io/api/commands/server",
    },
    {
      title: "session",
      url: "https://docs.cypress.io/api/commands/session",
    },
    {
      title: "setCookie",
      url: "https://docs.cypress.io/api/commands/setcookie",
    },
    {
      title: "shadow",
      url: "https://docs.cypress.io/api/commands/shadow",
    },
    {
      title: "should",
      url: "https://docs.cypress.io/api/commands/should",
    },
    {
      title: "siblings",
      url: "https://docs.cypress.io/api/commands/siblings",
    },
    {
      title: "spread",
      url: "https://docs.cypress.io/api/commands/spread",
    },
    {
      title: "spy",
      url: "https://docs.cypress.io/api/commands/spy",
    },
    {
      title: "stub",
      url: "https://docs.cypress.io/api/commands/stub",
    },
    {
      title: "submit",
      url: "https://docs.cypress.io/api/commands/submit",
    },
    {
      title: "task",
      url: "https://docs.cypress.io/api/commands/task",
    },
    {
      title: "then",
      url: "https://docs.cypress.io/api/commands/then",
    },
    {
      title: "tick",
      url: "https://docs.cypress.io/api/commands/tick",
    },
    {
      title: "title",
      url: "https://docs.cypress.io/api/commands/title",
    },
    {
      title: "trigger",
      url: "https://docs.cypress.io/api/commands/trigger",
    },
    {
      title: "type",
      url: "https://docs.cypress.io/api/commands/type",
    },
    {
      title: "uncheck",
      url: "https://docs.cypress.io/api/commands/uncheck",
    },
    {
      title: "url",
      url: "https://docs.cypress.io/api/commands/url",
    },
    {
      title: "viewport",
      url: "https://docs.cypress.io/api/commands/viewport",
    },
    {
      title: "visit",
      url: "https://docs.cypress.io/api/commands/visit",
    },
    {
      title: "wait",
      url: "https://docs.cypress.io/api/commands/wait",
    },
    {
      title: "window",
      url: "https://docs.cypress.io/api/commands/window",
    },
    {
      title: "within",
      url: "https://docs.cypress.io/api/commands/within",
    },
    {
      title: "wrap",
      url: "https://docs.cypress.io/api/commands/wrap",
    },
    {
      title: "writeFile",
      url: "https://docs.cypress.io/api/commands/writefile",
    },
  ],
  Utilities: [
    {
      title: "_",
      url: "https://docs.cypress.io/api/utilities/_",
    },
    {
      title: "$",
      url: "https://docs.cypress.io/api/utilities/$",
    },
    {
      title: "Blob",
      url: "https://docs.cypress.io/api/utilities/blob",
    },
    {
      title: "Buffer",
      url: "https://docs.cypress.io/api/utilities/buffer",
    },
    {
      title: "minimatch",
      url: "https://docs.cypress.io/api/utilities/minimatch",
    },
    {
      title: "Promise",
      url: "https://docs.cypress.io/api/utilities/promise",
    },
    {
      title: "sinon",
      url: "https://docs.cypress.io/api/utilities/sinon",
    },
  ],
  "Cypress API": [
    {
      title: "Commands",
      url: "https://docs.cypress.io/api/cypress-api/custom-commands",
    },
    {
      title: "Cookies",
      url: "https://docs.cypress.io/api/cypress-api/cookies",
    },
    {
      title: "Keyboard",
      url: "https://docs.cypress.io/api/cypress-api/keyboard-api",
    },
    {
      title: "Screenshot",
      url: "https://docs.cypress.io/api/cypress-api/screenshot-api",
    },
    {
      title: "SelectorPlayground",
      url: "https://docs.cypress.io/api/cypress-api/selector-playground-api",
    },
    {
      title: "Server",
      url: "https://docs.cypress.io/api/cypress-api/cypress-server",
    },
    {
      title: "arch",
      url: "https://docs.cypress.io/api/cypress-api/arch",
    },
    {
      title: "browser",
      url: "https://docs.cypress.io/api/cypress-api/browser",
    },
    {
      title: "config",
      url: "https://docs.cypress.io/api/cypress-api/config",
    },
    {
      title: "currentTest",
      url: "https://docs.cypress.io/api/cypress-api/currenttest",
    },
    {
      title: "dom",
      url: "https://docs.cypress.io/api/cypress-api/dom",
    },
    {
      title: "env",
      url: "https://docs.cypress.io/api/cypress-api/env",
    },
    {
      title: "isBrowser",
      url: "https://docs.cypress.io/api/cypress-api/isbrowser",
    },
    {
      title: "isCy",
      url: "https://docs.cypress.io/api/cypress-api/iscy",
    },
    {
      title: "log",
      url: "https://docs.cypress.io/api/cypress-api/cypress-log",
    },
    {
      title: "platform",
      url: "https://docs.cypress.io/api/cypress-api/platform",
    },
    {
      title: "session",
      url: "https://docs.cypress.io/api/cypress-api/session",
    },
    {
      title: "spec",
      url: "https://docs.cypress.io/api/cypress-api/spec",
    },
    {
      title: "testingType",
      url: "https://docs.cypress.io/api/cypress-api/testing-type",
    },
    {
      title: "version",
      url: "https://docs.cypress.io/api/cypress-api/version",
    },
  ],
  Plugins: [
    {
      title: "Writing a Plugin",
      url: "https://docs.cypress.io/api/plugins/writing-a-plugin",
    },
    {
      title: "Configuration",
      url: "https://docs.cypress.io/api/plugins/configuration-api",
    },
    {
      title: "Preprocessors",
      url: "https://docs.cypress.io/api/plugins/preprocessors-api",
    },
    {
      title: "Before Run",
      url: "https://docs.cypress.io/api/plugins/before-run-api",
    },
    {
      title: "After Run",
      url: "https://docs.cypress.io/api/plugins/after-run-api",
    },
    {
      title: "Before Spec",
      url: "https://docs.cypress.io/api/plugins/before-spec-api",
    },
    {
      title: "After Spec",
      url: "https://docs.cypress.io/api/plugins/after-spec-api",
    },
    {
      title: "Browser Launching",
      url: "https://docs.cypress.io/api/plugins/browser-launch-api",
    },
    {
      title: "After Screenshot",
      url: "https://docs.cypress.io/api/plugins/after-screenshot-api",
    },
  ],
  Examples: [
    {
      title: "Recipes",
      url: "https://docs.cypress.io/examples/examples/recipes",
    },
    {
      title: "Tutorials",
      url: "https://docs.cypress.io/examples/examples/tutorials",
    },
    {
      title: "Applications",
      url: "https://docs.cypress.io/examples/examples/applications",
    },
    {
      title: "Docker",
      url: "https://docs.cypress.io/examples/examples/docker",
    },
    {
      title: "Workshops",
      url: "https://docs.cypress.io/examples/examples/workshop",
    },
    {
      title: "Projects",
      url: "https://docs.cypress.io/examples/examples/projects-media",
    },
  ],
  FAQ: [
    {
      title: "Using Cypress",
      url: "https://docs.cypress.io/faq/questions/using-cypress-faq",
    },
    {
      title: "General Questions",
      url: "https://docs.cypress.io/faq/questions/general-questions-faq",
    },
    {
      title: "Dashboard",
      url: "https://docs.cypress.io/faq/questions/dashboard-faq",
    },
    {
      title: "Company",
      url: "https://docs.cypress.io/faq/questions/company-faq",
    },
  ],
};
