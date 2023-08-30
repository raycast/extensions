import { Action, ActionPanel, List } from '@raycast/api';

import tildify from 'tildify';
import { dirname } from "path";
import { build, bundleIdentifier } from '../preference';

interface LocalItemProps {
  project: string;
}

export default function LocalItem({project}: LocalItemProps) {
  const projectArrs = project.split('/');
  const name = projectArrs[projectArrs.length - 1];
  const prettyPath = tildify(project);
  const subtitle = dirname(prettyPath);

  return (
    <List.Item
      title={name}
      subtitle={subtitle}
      icon={{ fileIcon: project }}
      keywords={[name]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open
              title={`Open in ${build}`}
              icon="action-icon.png"
              target={project}
              application={bundleIdentifier}
            />
            <Action.ShowInFinder path={project} />
            <Action.OpenWith path={project} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Name" content={name} shortcut={{ modifiers: ["cmd"], key: "." }} />
            <Action.CopyToClipboard
              title="Copy Path"
              content={prettyPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}