import { ActionPanel, Action, Icon, List, Color } from "@raycast/api";

class CommitItem {
  prefix: string;
  title: string;
  subtitle: string;
  icon: string;

  constructor(prefix: string, title: string, subtitle: string, icon: string) {
    this.prefix = prefix;
    this.title = title;
    this.subtitle = subtitle;
    this.icon = icon;
  }
}

const listItems: CommitItem[] = [
  {
    prefix: "feat: ",
    title: "Feature",
    subtitle: "Introduces a new feature to the codebase",
    icon: "../assets/feature.png",
  },
  {
    prefix: "fix: ",
    title: "Bug Fix",
    subtitle: "Fixes a bug in the code",
    icon: "../assets/fix.png",
  },
  {
    prefix: "docs: ",
    title: "Documentation",
    subtitle: "Documentation-only changes",
    icon: "../assets/docs.png",
  },
  {
    prefix: "style: ",
    title: "Style",
    subtitle: "Changes that do not affect the meaning of code i.e. formatting",
    icon: "../assets/style.png",
  },
  {
    prefix: "refactor: ",
    title: "Code Refactoring",
    subtitle: "A code change that neither fixes a bug nor adds a feature",
    icon: "../assets/refactor.png",
  },
  {
    prefix: "perf: ",
    title: "Performance Improvements",
    subtitle: "A code change that improves performance",
    icon: "../assets/perf.png",
  },
  {
    prefix: "test: ",
    title: "Tests",
    subtitle: "Adding missing tests or correcting existing ones",
    icon: "../assets/test.png",
  },
  {
    prefix: "build: ",
    title: "Build",
    subtitle: "Changes that affect the build system or external dependencies",
    icon: "../assets/build.png",
  },
  {
    prefix: "ci: ",
    title: "Continuous Integration",
    subtitle: "Changes to the CI configuration files and scripts",
    icon: "../assets/ci.png",
  },
  {
    prefix: "chore: ",
    title: "Chore",
    subtitle: "Other changes that do not modify src or test files",
    icon: "../assets/chore.png",
  },
  {
    prefix: "revert: ",
    title: "Revert",
    subtitle: "Reverts a previous commit",
    icon: "../assets/revert.png",
  },
];

export default function Command() {
  return (
    <List>
      {listItems.map((item, index) => (
        <List.Item
          key={index}
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          accessories={[{ tag: { value: `${item.prefix}`, color: Color.Green } }]}
          keywords={[item.prefix]}
          actions={
            <ActionPanel>
              <Action.Paste content={item.prefix} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
