import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { ReactNode, useEffect, useState } from "react";

import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";

const INSTALL_COMMAND = "cargo install delphitools-cli";

type DelphitoolsInstallStatus =
  | {
      installed: true;
      version: string;
    }
  | {
      installed: false;
    };

export async function getDelphitoolsInstallStatus(): Promise<DelphitoolsInstallStatus> {
  try {
    const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
      "--version",
    ]);
    return {
      installed: true,
      version: stdout.trim(),
    };
  } catch {
    return {
      installed: false,
    };
  }
}

export function DelphitoolsRequired({
  children,
}: {
  children: (props: { isCheckingInstall: boolean }) => ReactNode;
}) {
  const [isDelphitoolsInstalled, setIsDelphitoolsInstalled] =
    useState<boolean>();

  useEffect(() => {
    async function checkInstallStatus() {
      const status = await getDelphitoolsInstallStatus();
      setIsDelphitoolsInstalled(status.installed);
    }

    checkInstallStatus();
  }, []);

  if (isDelphitoolsInstalled === false) {
    return <DelphitoolsInstallStatusView status={{ installed: false }} />;
  }

  return children({
    isCheckingInstall: isDelphitoolsInstalled === undefined,
  });
}

export function DelphitoolsInstallStatusView({
  status,
}: {
  status: DelphitoolsInstallStatus;
}) {
  if (!status.installed) {
    return (
      <Detail
        markdown={`# delphitools CLI Not Installed

This extension runs the local \`delphitools\` CLI. Install it with Cargo, then run this command again.

\`\`\`sh
${INSTALL_COMMAND}
\`\`\`
`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              title="Copy Install Command"
              content={INSTALL_COMMAND}
            />
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Status"
              text="Not installed"
              icon={Icon.XMarkCircle}
            />
            <Detail.Metadata.Label title="Executable" text="delphitools" />
          </Detail.Metadata>
        }
      />
    );
  }

  return (
    <Detail
      markdown={`# delphitools CLI Installed

${status.version || "The local CLI is available on PATH."}
`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text="Installed"
            icon={Icon.CheckCircle}
          />
          <Detail.Metadata.Label title="Executable" text="delphitools" />
          {status.version ? (
            <Detail.Metadata.Label title="Version" text={status.version} />
          ) : null}
        </Detail.Metadata>
      }
    />
  );
}
