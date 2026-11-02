import { useState } from "react";
import { Keyboard, Action, ActionPanel, Alert, Detail, Icon, confirmAlert, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ResumeDocument, deleteResumeDocument } from "../utils/resumeDocuments";
import { makeMarkdownFromResume } from "../utils/renderResume";
import ResumeEditor from "./ResumeEditor";

export default function LocalResumeDetail({
  document: initialDocument,
  onChanged,
}: {
  document: ResumeDocument;
  onChanged: () => Promise<void>;
}) {
  const [document, setDocument] = useState(initialDocument);
  const { pop } = useNavigation();
  return (
    <Detail
      navigationTitle={document.title}
      markdown={makeMarkdownFromResume(document.resume)}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Resume"
            shortcut={Keyboard.Shortcut.Common.Edit}
            icon={Icon.Pencil}
            target={
              <ResumeEditor
                document={document}
                onSaved={async (saved) => {
                  setDocument(saved);
                  await onChanged();
                }}
              />
            }
          />
          <Action.CopyToClipboard
            title="Copy JSON"
            shortcut={Keyboard.Shortcut.Common.Copy}
            content={JSON.stringify(document.resume, null, 2)}
          />
          {document.sourceUrl && (
            <Action.OpenInBrowser
              title="Open Source URL"
              shortcut={Keyboard.Shortcut.Common.Open}
              url={document.sourceUrl}
            />
          )}
          <Action
            title="Delete Resume"
            shortcut={Keyboard.Shortcut.Common.Remove}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              if (
                !(await confirmAlert({
                  title: `Delete "${document.title}"?`,
                  primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                }))
              )
                return;
              try {
                await deleteResumeDocument(document.id);
                await onChanged();
                pop();
              } catch (error) {
                await showFailureToast(error, { title: "Could not delete resume" });
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
