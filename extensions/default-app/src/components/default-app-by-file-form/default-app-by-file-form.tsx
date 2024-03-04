import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useMemo, useState } from "react";
import { useErrors } from "../../hooks/use-errors";
import { Openable } from "../../types/openable";
import { UniformType } from "../../types/uniform-type";
import { getUniformType } from "../../utitlities/swift/get-uniform-type";
import { DefaultAppDropdown } from "../default-app-dropdown/default-app-dropdown";

export function DefaultAppByFileForm(props: {
  defaultValues?: { filePath?: string };
  mode: Openable["type"];
  onSubmit?: (values: {
    applicationPath: string;
    uniformTypeId: string;
    filePath: string;
  }) => Promise<boolean> | boolean | void | Promise<void>;
  navigationTitle?: string;
}) {
  const [filePath, setFilePath] = useState(props.defaultValues?.filePath);
  const [appPath, setAppPath] = useState<string>();
  const [uniformType, setUniformType] = useState<UniformType>();
  const { errors, setErrors, clearErrors } = useErrors<"filePath" | "appPath">();

  const openable = useMemo((): Openable | undefined => {
    if (props.mode === "file" && filePath) {
      return { type: "file", filePath };
    } else if (props.mode === "file-type" && uniformType) {
      return { type: "file-type", uniformTypeId: uniformType.id };
    }

    return undefined;
  }, [filePath, props.mode, uniformType]);

  return (
    <Form
      navigationTitle={props.navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.AppWindowList}
            title="Set Default App"
            onSubmit={async () => {
              if (!appPath || !filePath || !uniformType) {
                if (!filePath || !uniformType) {
                  setErrors({ filePath: "Please select a file." });
                }

                if (!appPath) {
                  setErrors({ appPath: "Please select an application." });
                }

                return false;
              }

              return await props.onSubmit?.({
                applicationPath: appPath,
                uniformTypeId: uniformType.id,
                filePath: filePath,
              });
            }}
          />
          <ActionPanel.Section>
            {filePath && <Action.ShowInFinder title="Show File in Finder" path={filePath} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {uniformType && <Action.CopyToClipboard title="Copy Uniform Type Identifier" content={uniformType.id} />}
            {uniformType?.preferredFilenameExtension && (
              <Action.CopyToClipboard title="Copy File Extension" content={uniformType.preferredFilenameExtension} />
            )}
            {uniformType?.preferredMimeType && (
              <Action.CopyToClipboard title="Copy MIME Type" content={uniformType.preferredMimeType} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description
        title="Type"
        text={
          uniformType
            ? uniformType.description ?? uniformType.id
            : `No ${props.mode === "file" ? "file" : "file type"} selected`
        }
      />

      <Form.FilePicker
        id="filePaths"
        title="File"
        info={
          props.mode === "file"
            ? "Select a file to set a default app for."
            : "Select a file to set the default app for its type."
        }
        error={errors.filePath}
        showHiddenFiles={true}
        allowMultipleSelection={false}
        autoFocus={true}
        canChooseDirectories={false}
        value={filePath ? [filePath] : []}
        onChange={async (filePaths) => {
          const filePath = filePaths[0];
          if (filePath === undefined) {
            setAppPath(undefined);
            setFilePath(undefined);
            setUniformType(undefined);
          } else {
            setUniformType(await getUniformType(filePath));
            clearErrors("filePath");
            setFilePath(filePath);
          }
        }}
      />
      <DefaultAppDropdown
        openable={openable}
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
