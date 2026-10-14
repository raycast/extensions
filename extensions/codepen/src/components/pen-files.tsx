import { Action, ActionPanel, Detail, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { getClient } from "../lib/api";
import { useMutation } from "../lib/hooks";
import { buildMessage, isBuildPending, type PenFile } from "../lib/models";
import { codeMarkdown, CommonActions, EmptyView } from "./common";

export function PenFiles({
  penId,
  versionId,
  onChanged,
}: {
  penId: string;
  versionId?: string;
  onChanged?: () => void;
}) {
  const { data, error, isLoading, revalidate } = usePromise(
    async (id: string, historicalVersion?: string) => {
      if (historicalVersion)
        return { pen: await getClient().getPen(id), version: await getClient().getVersion(historicalVersion) };
      const snapshot = await getClient().snapshot(id);
      return { ...snapshot, version: snapshot.version, files: snapshot.files };
    },
    [penId, versionId],
  );
  const refreshAfterSave = () => {
    void revalidate();
    onChanged?.();
  };
  const files = data?.version?.files ?? (data && "files" in data ? data.files : []);
  const currentVersion = data?.version;
  const canEdit = !versionId && data?.pen.editor === "V2" && currentVersion && !isBuildPending(currentVersion.build);
  return (
    <List
      isLoading={isLoading}
      navigationTitle={versionId ? "Version Source Files" : `${data?.pen.title ?? "Pen"} — Source Files`}
    >
      <EmptyView error={error} title="No Source Files" description="Open the Pen in CodePen to add files.">
        {canEdit && (
          <Action.Push
            title="Add Text File"
            icon={Icon.Plus}
            target={<FileForm penId={penId} versionId={currentVersion.id} onSaved={refreshAfterSave} />}
          />
        )}
        <CommonActions refresh={revalidate} />
      </EmptyView>
      {files?.map((file) => (
        <List.Item
          key={file.id}
          title={file.path}
          icon={file.is_binary ? Icon.HardDrive : Icon.Document}
          accessories={file.is_binary ? [{ tag: "Binary" }] : []}
          actions={
            <ActionPanel>
              <Action.Push
                title="View File"
                icon={Icon.Eye}
                target={
                  <Detail
                    navigationTitle={file.path}
                    markdown={
                      file.content !== null
                        ? codeMarkdown(file.content, file.name)
                        : "Binary file. Open the raw URL to view it."
                    }
                    actions={
                      <ActionPanel>
                        {file.content !== null && <Action.CopyToClipboard title="Copy Source" content={file.content} />}
                        {file.url && <Action.OpenInBrowser title="Open Raw File" url={file.url} />}
                      </ActionPanel>
                    }
                  />
                }
              />
              {file.content !== null && <Action.CopyToClipboard title="Copy Source" content={file.content} />}
              {file.url && <Action.OpenInBrowser title="Open Raw File" url={file.url} />}
              {canEdit && !file.is_binary && (
                <Action.Push
                  title="Edit Source File"
                  icon={Icon.Pencil}
                  target={
                    <FileForm penId={penId} versionId={currentVersion.id} file={file} onSaved={refreshAfterSave} />
                  }
                />
              )}
              {canEdit && (
                <Action.Push
                  title="Add Text File"
                  icon={Icon.Plus}
                  target={<FileForm penId={penId} versionId={currentVersion.id} onSaved={refreshAfterSave} />}
                />
              )}
              {data && <Action.OpenInBrowser title="Open Pen in CodePen" url={data.pen.urls.editor} />}
              <CommonActions refresh={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function FileForm({
  penId,
  versionId,
  file,
  onSaved,
}: {
  penId: string;
  versionId: string;
  file?: PenFile;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const mutation = useMutation();
  const { handleSubmit, itemProps } = useForm<{ path: string; content: string }>({
    initialValues: { path: file?.path ?? "/", content: file?.content ?? "" },
    validation: { path: FormValidation.Required },
    onSubmit: async (values) => {
      await mutation.run(
        "Source file saved",
        () => getClient().writeFiles(penId, versionId, [{ path: file?.path ?? values.path, content: values.content }]),
        (result) => {
          void showToast({
            style: Toast.Style.Success,
            title: "Source file saved",
            message: buildMessage(result.build),
          });
          onSaved();
          pop();
        },
      );
    },
  });
  return (
    <Form
      isLoading={mutation.isLoading}
      navigationTitle={file ? `Edit ${file.path}` : "Add Text File"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save and Build" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {file ? (
        <Form.Description title="Path" text={file.path} />
      ) : (
        <Form.TextField title="Path" placeholder="/src/app.js" {...itemProps.path} />
      )}
      <Form.TextArea title="Source" {...itemProps.content} />
      <Form.Description text="Saving creates a new version and starts a build. If auto-deploy is enabled, CodePen may also publish your changes to the live deployment. CodePen may format or adjust your files. If the Pen changed since you opened this form, refresh the source files before saving again." />
    </Form>
  );
}
