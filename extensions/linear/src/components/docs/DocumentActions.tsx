import { deleteDocument, DocumentResult, restoreDocument, updateDocument } from "../../api/documents";
import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import OpenInLinear from "../OpenInLinear";
import { MutatePromise } from "@raycast/utils";
import { isLinearInstalled } from "../../helpers/isLinearInstalled";
import { getProjectIcon } from "../../helpers/projects";
import { ProjectResult } from "../../api/getProjects";
import { getErrorMessage } from "../../helpers/errors";
import { InitiativeResult } from "../../api/initiatives";
import { getInitiativeIcon } from "../../helpers/initiatives";

export type DocumentActionsProps = {
  doc: DocumentResult;
  mutateDocs: MutatePromise<{ docs: DocumentResult[]; hasMoreDocs: boolean } | undefined>;
  projects?: ProjectResult[];
  initiatives?: InitiativeResult[];
};

function MoveDocument({ doc, mutateDocs, projects, initiatives }: DocumentActionsProps) {
  const moveDocument = async ({ project, initiative }: { project?: ProjectResult; initiative?: InitiativeResult }) => {
    const msg = `to ${project ? `Project: ${project.name}` : `Initiative: ${initiative?.name}`}`;
    const toast = await showToast(Toast.Style.Animated, "Moving document", msg);
    const payload = project ? { projectId: project.id } : { initiativeId: initiative?.id };
    await mutateDocs(updateDocument(doc.id, payload), {
      optimisticUpdate: (data) => {
        if (!data) {
          return undefined;
        }

        const overrides = project
          ? { project: { ...project }, initiative: undefined }
          : { initiative: { ...initiative }, project: undefined };
        return {
          ...data,
          docs: data.docs?.map((d) => (d.id !== doc.id ? d : ({ ...d, ...overrides } as DocumentResult))),
        };
      },
    })
      .then(({ success }) => {
        if (success) {
          toast.style = Toast.Style.Success;
          toast.title = "Moved document";
        }
      })
      .catch((err) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to move document";
        toast.message = getErrorMessage(err);
        toast.primaryAction = {
          title: "Retry",
          onAction: () => moveDocument({ project, initiative }),
          shortcut: { modifiers: ["cmd"], key: "r" },
        };
      });
  };

  return (
    ((projects ?? []).length > 0 || (initiatives ?? []).length > 0) && (
      <ActionPanel.Submenu
        title="Move Document"
        icon={Icon.Move}
        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        filtering={{ keepSectionOrder: true }}
      >
        {(initiatives ?? []).length > 0 && (
          <ActionPanel.Section title="Initiatives">
            {initiatives?.map((initiative) => (
              <Action
                key={initiative.id}
                title={initiative.name + (doc.initiative?.id === initiative.id ? " [current]" : "")}
                icon={getInitiativeIcon(initiative)}
                onAction={() => moveDocument({ initiative })}
              />
            ))}
          </ActionPanel.Section>
        )}
        {(projects ?? []).length > 0 && (
          <ActionPanel.Section title="Projects">
            {projects?.map((project) => (
              <Action
                key={project.id}
                title={project.name + (doc.project?.id === project.id ? " [current]" : "")}
                icon={getProjectIcon(project)}
                onAction={() => moveDocument({ project })}
              />
            ))}
          </ActionPanel.Section>
        )}
      </ActionPanel.Submenu>
    )
  );
}

export function DocumentActions({ doc, mutateDocs, ...rest }: DocumentActionsProps) {
  const restore = async () => {
    const toast = await showToast(Toast.Style.Animated, "Restoring document", doc.title);
    await mutateDocs(restoreDocument(doc.id), {
      optimisticUpdate: (data) => {
        if (!data) {
          return undefined;
        }

        return { ...data, docs: data.docs?.map((d) => (d.id !== doc.id ? d : { ...d, archivedAt: undefined })) };
      },
    })
      .then(({ success }) => {
        if (success) {
          toast.style = Toast.Style.Success;
          toast.title = "Document restored";
          toast.message = doc.title;
        }
      })
      .catch((err) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to restore document";
        toast.message = getErrorMessage(err);
        toast.primaryAction = {
          title: "Retry",
          onAction: restore,
          shortcut: { modifiers: ["cmd"], key: "r" },
        };
      });
  };

  const trash = async () =>
    confirmAlert({
      title: "Delete Document",
      message: `Are you sure you want to delete '${doc.title}'?`,
      icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive, onAction: tryDelete },
    });

  const tryDelete = async () => {
    const toast = await showToast(Toast.Style.Animated, "Deleting document", doc.title);
    await mutateDocs(deleteDocument(doc.id), {
      optimisticUpdate: (data) => {
        if (!data) {
          return undefined;
        }

        return { ...data, docs: data.docs?.map((d) => (d.id !== doc.id ? d : { ...d, archivedAt: new Date() })) };
      },
    })
      .then(({ success }) => {
        if (success) {
          toast.style = Toast.Style.Success;
          toast.title = "Document deleted";
          toast.message = doc.title;
        }
      })
      .catch((err) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete document";
        toast.message = getErrorMessage(err);
        toast.primaryAction = {
          title: "Retry",
          onAction: tryDelete,
          shortcut: { modifiers: ["cmd"], key: "r" },
        };
      });
  };

  return (
    <>
      <OpenInLinear title="Open Document" url={doc.url} />

      <ActionPanel.Section>
        <MoveDocument doc={doc} mutateDocs={mutateDocs} {...rest} />

        {doc.archivedAt ? (
          <Action
            title="Restore Document"
            icon={{ source: Icon.NewDocument, tintColor: Color.Blue }}
            onAction={restore}
            shortcut={{ modifiers: ["ctrl"], key: "r" }}
          />
        ) : (
          <Action
            title="Delete Document"
            icon={{ source: Icon.DeleteDocument, tintColor: Color.Red }}
            onAction={trash}
            style={Action.Style.Destructive}
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
