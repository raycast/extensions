import { ActionPanel, List, Action } from "@raycast/api";

export default function SearchDocumentation() {
  return (
    <List>
      {Object.entries(documentation).map(([sectionTitle, items]) => (
        <List.Section title={sectionTitle} key={sectionTitle}>
          {items.map((item) => (
            <List.Item
              key={item.url}
              title={item.title}
              keywords={[item.title, sectionTitle]}
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
  "Getting Started": [
    {
      title: "Installation",
      url: "https://playwright.dev/docs/intro",
    },
    {
      title: "Writing Tests",
      url: "https://playwright.dev/docs/writing-tests",
    },
    {
      title: "Running Tests",
      url: "https://playwright.dev/docs/running-tests",
    },
    {
      title: "Test Generator",
      url: "https://playwright.dev/docs/codegen-intro",
    },
    {
      title: "Trace Viewer",
      url: "https://playwright.dev/docs/trace-viewer-intro",
    },
    {
      title: "CI Github Actions",
      url: "https://playwright.dev/docs/ci-intro",
    },
  ],
  "Playwright Test": [
    {
      title: "Annotations",
      url: "https://playwright.dev/docs/test-annotations",
    },
    {
      title: "API testing",
      url: "https://playwright.dev/docs/test-api-testing",
    },
    {
      title: "Assertions",
      url: "https://playwright.dev/docs/test-assertions",
    },
    {
      title: "Authentication",
      url: "https://playwright.dev/docs/test-auth",
    },
    {
      title: "Command line",
      url: "https://playwright.dev/docs/test-cli",
    },
    {
      title: "Configuration",
      url: "https://playwright.dev/docs/test-configuration",
    },
    {
      title: "Page Object Model",
      url: "https://playwright.dev/docs/test-pom",
    },
    {
      title: "Parallelism and sharding",
      url: "https://playwright.dev/docs/test-parallel",
    },
    {
      title: "Parametrize tests",
      url: "https://playwright.dev/docs/test-parameterize",
    },
    {
      title: "Reporters",
      url: "https://playwright.dev/docs/test-reporters",
    },
    {
      title: "Test retry",
      url: "https://playwright.dev/docs/test-retries",
    },
    {
      title: "Timeouts",
      url: "https://playwright.dev/docs/test-timeouts",
    },
    {
      title: "Visual comparisons",
      url: "https://playwright.dev/docs/test-snapshots",
    },
    {
      title: "Advanced: configuration",
      url: "https://playwright.dev/docs/test-advanced",
    },
    {
      title: "Advanced: fixtures",
      url: "https://playwright.dev/docs/test-fixtures",
    },
    {
      title: "TypeScript",
      url: "https://playwright.dev/docs/test-typescript",
    },
    {
      title: "Experimental: components",
      url: "https://playwright.dev/docs/test-components",
    },
  ],
  Guides: [
    {
      title: "Library",
      url: "https://playwright.dev/docs/library",
    },
    {
      title: "Accessibility testing",
      url: "https://playwright.dev/docs/accessibility-testing",
    },
    {
      title: "Auto-waiting",
      url: "https://playwright.dev/docs/actionability",
    },
    {
      title: "Authentication",
      url: "https://playwright.dev/docs/auth",
    },
    {
      title: "Browsers",
      url: "https://playwright.dev/docs/browsers",
    },
    {
      title: "Browser Contexts",
      url: "https://playwright.dev/docs/browser-contexts",
    },
    {
      title: "Chrome Extensions",
      url: "https://playwright.dev/docs/chrome-extensions",
    },
    {
      title: "Command line tools",
      url: "https://playwright.dev/docs/cli",
    },
    {
      title: "Debugging Tests",
      url: "https://playwright.dev/docs/debug",
    },
    {
      title: "Debugging Selectors",
      url: "https://playwright.dev/docs/debug-selectors",
    },
    {
      title: "Dialogs",
      url: "https://playwright.dev/docs/dialogs",
    },
    {
      title: "Downloads",
      url: "https://playwright.dev/docs/downloads",
    },
    {
      title: "Emulation",
      url: "https://playwright.dev/docs/emulation",
    },
    {
      title: "Evaluating JavaScript",
      url: "https://playwright.dev/docs/evaluating",
    },
    {
      title: "Events",
      url: "https://playwright.dev/docs/events",
    },
    {
      title: "Extensibility",
      url: "https://playwright.dev/docs/extensibility",
    },
    {
      title: "Frames",
      url: "https://playwright.dev/docs/frames",
    },
    {
      title: "Handles",
      url: "https://playwright.dev/docs/handles",
    },
    {
      title: "Input",
      url: "https://playwright.dev/docs/input",
    },
    {
      title: "Locators",
      url: "https://playwright.dev/docs/locators",
    },
    {
      title: "Mock APIs",
      url: "https://playwright.dev/docs/mock",
    },
    {
      title: "Navigations",
      url: "https://playwright.dev/docs/navigations",
    },
    {
      title: "Network",
      url: "https://playwright.dev/docs/network",
    },
    {
      title: "Pages",
      url: "https://playwright.dev/docs/pages",
    },
    {
      title: "Page Object Models",
      url: "https://playwright.dev/docs/pom",
    },
    {
      title: "Screenshots",
      url: "https://playwright.dev/docs/screenshots",
    },
    {
      title: "Selectors",
      url: "https://playwright.dev/docs/selectors",
    },
    {
      title: "Test Generator",
      url: "https://playwright.dev/docs/codegen",
    },
    {
      title: "Trace Viewer",
      url: "https://playwright.dev/docs/trace-viewer",
    },
    {
      title: "Videos",
      url: "https://playwright.dev/docs/videos",
    },
  ],
  Integrations: [
    {
      title: "Docker",
      url: "https://playwright.dev/docs/docker",
    },
    {
      title: "Continuous Integration",
      url: "https://playwright.dev/docs/ci",
    },
    {
      title: "Third party runners",
      url: "https://playwright.dev/docs/test-runners",
    },
    {
      title: "Selenium Grid",
      url: "https://playwright.dev/docs/selenium-grid",
    },
  ],
};
