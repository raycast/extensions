import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { useErrors } from "../../hooks/use-errors";
import { UniformType } from "../../types/uniform-type";
import { DefaultAppDropdown } from "../default-app-dropdown/default-app-dropdown";

export function DefaultAppByUniformTypeForm(props: {
  navigationTitle?: string;
  onSubmit?: (values: { applicationPath: string }) => Promise<boolean> | boolean | void | Promise<void>;
  uniformType: UniformType;
  isLoading?: boolean;
}) {
  const [appPath, setAppPath] = useState<string | undefined>();

  const { errors, setErrors, clearErrors } = useErrors<"appPath">();

  return (
    <Form
      isLoading={props.isLoading}
      navigationTitle={props.navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Default App"
            onSubmit={async () => {
              if (!appPath) {
                setErrors({ appPath: "Please select an application." });
                return false;
              }

              return await props.onSubmit?.({
                applicationPath: appPath,
              });
            }}
          />
          <ActionPanel.Section>
            {props.uniformType && (
              <Action.CopyToClipboard title="Copy Uniform Type Identifier" content={props.uniformType.id} />
            )}
            {props.uniformType?.preferredFilenameExtension && (
              <Action.CopyToClipboard
                title="Copy File Extension"
                content={props.uniformType.preferredFilenameExtension}
              />
            )}
            {props.uniformType?.preferredMimeType && (
              <Action.CopyToClipboard title="Copy MIME Type" content={props.uniformType.preferredMimeType} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description title="Uniform Type Identifier" text={props.uniformType.id} />

      <DefaultAppDropdown
        openable={{ type: "file-type", uniformTypeId: props.uniformType.id }}
        id="appPath"
        value={appPath ?? ""}
        onChange={(appPath) => {
          if (appPath) {
            clearErrors("appPath");
          }
          setAppPath(appPath);
        }}
        title="Default App"
        error={errors.appPath}
      />
    </Form>
  );
}
