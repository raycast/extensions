import { Detail, useNavigation } from "@raycast/api";
import { CaskActionPanel } from "./actionPanels";
import { Cask, brewName } from "../brew";
import { Dependencies } from "./dependencies";

export function CaskInfo(props: {
  cask: Cask;
  isInstalled: (name: string) => boolean;
  onAction: (result: boolean) => void;
}): JSX.Element {
  const { pop } = useNavigation();
  const { cask } = props;

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
          <Dependencies
            title="Conflicts With"
            dependencies={cask.conflicts_with?.cask}
            isInstalled={props.isInstalled}
          />
          <Detail.Metadata.Label title="Auto Updates" text={cask.auto_updates ? "Yes" : "No"} />
        </Detail.Metadata>
      }
      actions={
        <CaskActionPanel
          cask={cask}
          showDetails={false}
          isInstalled={props.isInstalled}
          onAction={(result) => {
            pop();
            props.onAction(result);
          }}
        />
      }
    />
  );
}

/// Private

function CaskDependencies(props: { cask: Cask }): JSX.Element {
  const macos = props.cask.depends_on.macos;

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

function CaskVersion(props: { cask: Cask }): JSX.Element {
  let version = "";
  if (props.cask.installed) {
    version = `${props.cask.installed} (installed)`;
  } else {
    version = props.cask.version;
  }
  if (version) {
    return <Detail.Metadata.Label title="Version" text={version} />;
  }
}

function formatInfo(cask: Cask): string {
  return `
# ${brewName(cask)}
${cask.desc}

${formatCaveats(cask)}
  `;
}

function formatCaveats(cask: Cask): string {
  let caveats = "";

  if (cask.caveats) {
    caveats += `
${cask.caveats}
    `;
  }

  if (caveats) {
    return `#### Caveats
${caveats}
    `;
  } else {
    return "";
  }
}
