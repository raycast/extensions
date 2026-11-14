import { Action, ActionPanel, Detail } from "@raycast/api";
import { ManageProviders } from "../manage-providers";
import type { InvalidSettingsError } from "../core/errors";

export function SettingsErrorView({ error }: { readonly error: InvalidSettingsError }) {
  return (
    <Detail
      markdown={`# Check provider settings\n\n${error.message}`}
      actions={
        <ActionPanel>
          <Action.Push title="Manage Providers" target={<ManageProviders />} />
        </ActionPanel>
      }
    />
  );
}
