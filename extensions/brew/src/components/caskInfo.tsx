import { Detail, useNavigation } from "@raycast/api";
import { CaskActionPanel } from "./actionPanels";
import { Cask, brewName } from '../brew';

export function CaskInfo(props: {cask: Cask, onAction: (result: boolean) => void}) {
  const { pop } = useNavigation();

  return (
    <Detail
    markdown={formatInfo(props.cask)}
    actions={<CaskActionPanel cask={props.cask} showDetails={false} onAction={(result) => {
      pop();
      props.onAction(result);
    }} />}
    />
  );
}

/// Private

function formatInfo(cask: Cask): string {
  return `
# ${brewName(cask)}
${cask.desc}

[${cask.homepage}](${cask.homepage})

${formatVersion(cask)}

${formatConflicts(cask)}

${formatCaveats(cask)}
  `;
}

function formatVersion(cask: Cask): string {
  if (!cask.version) { return ''; }

  let version = cask.version;
  if (cask.installed) {
    version = `${cask.installed} (installed)`;
  }

  return `
#### Version:

${version}

#### Auto Updates:

${cask.auto_updates}
  `;
}

function formatConflicts(cask: Cask): string {
  if (!cask.conflicts_with) { return ''; }

  return `#### Conflicts With:
${cask.conflicts_with.join(', ')}
  `;
}

function formatCaveats(cask: Cask): string {
  let caveats = '';

  if (cask.caveats) {
    caveats += `
${cask.caveats}
    `;
  }

  if (caveats) {
    return `#### Caveats:
${caveats}
    `
  } else {
    return '';
  }
}
