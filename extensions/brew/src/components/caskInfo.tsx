import { Detail, useNavigation } from "@raycast/api";
import { CaskActionPanel } from "./actionPanels";
import { Cask, brewName } from "../brew";
import { Dependencies } from "./dependencies";

export function CaskInfo({
  cask,
  isInstalled,
  onAction,
}: {
  cask: Cask;
  isInstalled: (name: string) => boolean;
  onAction: (result: boolean) => void;
}): JSX.Element {
  const { pop } = useNavigation();

  return (
    <Detail
      markdown={formatInfo(cask)}
      navigationTitle={`Cask Info: ${brewName(cask)}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Homepage" text={cask.homepage} target={cask.homepage} />
          <Detail.Metadata.Label title="Tap" text={cask.tap} />
          <CaskVersion cask={cask} />
          <CaskDependencies cask={cask} />
          <Dependencies title="Conflicts With" dependencies={cask.conflicts_with?.cask} isInstalled={isInstalled} />
          <Detail.Metadata.Label title="Auto Updates" text={cask.auto_updates ? "Yes" : "No"} />
        </Detail.Metadata>
      }
      actions={
        <CaskActionPanel
          cask={cask}
          showDetails={false}
          isInstalled={isInstalled}
          onAction={(result) => {
            pop();
            onAction(result);
          }}
        />
      }
    />
  );
}

/// Private

function CaskDependencies({ cask }: { cask: Cask }) {
  const macos = cask.depends_on?.macos;

  if (!macos) {
    return null;
  }

  return (
    <Detail.Metadata.TagList title="macOS Version">
      {Object.keys(macos).map((key) => {
        const values = macos[key];
        if (values) {
          return <Detail.Metadata.TagList.Item key={key} text={`${key} ${values.join(", ")}`} />;
        }
      })}
    </Detail.Metadata.TagList>
  );
}

function CaskVersion({ cask }: { cask: Cask }) {
  const version = cask.installed ? `${cask.installed} (installed)` : cask.version;
  return version ? <Detail.Metadata.Label title="Version" text={version} /> : null;
}

function formatInfo(cask: Cask): string {
  return `
# ${brewName(cask)}
${cask.desc}

${formatCaveats(cask)}
  `;
}

function formatCaveats(cask: Cask): string {
  if (cask.caveats) {
    return `#### Caveats
${cask.caveats}
    `;
  }
  return "";
}
