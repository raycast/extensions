import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { installPackage } from "../choco/cli";
import { runPackageTask } from "./PackageActions";

interface InstallVersionFormProps {
  packageId: string;
  suggestedVersion?: string;
  onSuccess: () => void;
}

export function InstallVersionForm({
  packageId,
  suggestedVersion,
  onSuccess,
}: InstallVersionFormProps) {
  const { pop } = useNavigation();
  const [version, setVersion] = useState(suggestedVersion ?? "");
  const [versionError, setVersionError] = useState<string | undefined>();

  async function handleSubmit(values: {
    version: string;
    openInTerminal: boolean;
  }) {
    const trimmed = values.version.trim();
    if (!trimmed) {
      setVersionError("Version is required");
      return;
    }

    const ok = await runPackageTask({
      loadingTitle: `Installing ${packageId} (${trimmed})...`,
      successTitle: `Installed ${packageId} ${trimmed}`,
      errorTitle: `Failed to install ${packageId}`,
      task: () =>
        installPackage(packageId, {
          version: trimmed,
          forceTerminal: values.openInTerminal,
        }),
    });

    if (ok) {
      onSuccess();
      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Install Version"
            icon={Icon.Download}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Package" text={packageId} />
      <Form.TextField
        id="version"
        title="Version"
        placeholder="e.g. 2.56.1"
        value={version}
        error={versionError}
        onChange={(value) => {
          setVersion(value);
          if (versionError) {
            setVersionError(undefined);
          }
        }}
      />
      <Form.Checkbox
        id="openInTerminal"
        label="Open in elevated terminal window"
        defaultValue={false}
      />
    </Form>
  );
}
