import { deleteDocument, Doc, restoreDocument } from "../../api/documents";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import OpenInLinear from "../OpenInLinear";
import { MutatePromise } from "@raycast/utils";
import { isLinearInstalled } from "../../helpers/isLinearInstalled";

type DocumentActionsProps = {
  doc: Doc;
  mutateDocs: MutatePromise<{ docs: Doc[]; hasMoreDocs: boolean } | undefined>;
};

export function DocumentActions({ doc, mutateDocs }: DocumentActionsProps) {
  const restore = async () => {
    await mutateDocs(restoreDocument(doc.id), {
      optimisticUpdate: (data) => {
        if (!data) {
          return undefined;
        }

        return { ...data, docs: data.docs?.map((d) => (d.id !== doc.id ? d : { ...d, archivedAt: undefined })) };
      },
    });
  };

  const trash = async () => {
    await mutateDocs(deleteDocument(doc.id), {
      optimisticUpdate: (data) => {
        if (!data) {
          return undefined;
        }

        return { ...data, docs: data.docs?.map((d) => (d.id !== doc.id ? d : { ...d, archivedAt: new Date() })) };
      },
    });
  };

  return (
    <>
      <OpenInLinear title="Open Document" url={doc.url} />

      <ActionPanel.Section>
        {doc.archivedAt ? (
          <Action
            title="Restore Document"
            icon={{ source: Icon.NewDocument, tintColor: Color.Green }}
            onAction={restore}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
        ) : (
          <Action
            title="Delete Document"
            icon={{ source: Icon.DeleteDocument, tintColor: Color.Red }}
            onAction={trash}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CreateQuicklink
          icon={Icon.RaycastLogoPos}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          quicklink={{ link: doc.url, name: doc.title, application: isLinearInstalled ? "Linear" : undefined }}
        />

        <Action.CopyToClipboard
          icon={Icon.Link}
          content={doc.url}
          title="Copy Link"
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />

        <Action.CopyToClipboard
          icon={Icon.Clipboard}
          content={doc.title}
          title="Copy Title"
          shortcut={{ modifiers: ["cmd", "shift"], key: "'" }}
        />
      </ActionPanel.Section>
    </>
  );
}
