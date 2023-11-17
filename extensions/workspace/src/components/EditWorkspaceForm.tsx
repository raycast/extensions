import { Toast, showToast, useNavigation } from "@raycast/api";
import { useCallback } from "react";
import { Workspace } from "../types";
import WorkspaceForm from "./WorkspaceForm";

function EditWorkspaceForm(props: { draftValue?: Workspace; onEdit: (workspace: Workspace) => void }) {
  const { onEdit, draftValue } = props;
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    (workspace: Workspace) => {
      onEdit(workspace);
      showToast({
        style: Toast.Style.Success,
        title: "Edit Workspace",
        message: workspace.title,
      });
      pop();
    },
    [onEdit, pop],
  );

  return <WorkspaceForm draftValue={draftValue} handleSubmit={handleSubmit} />;
}

export default EditWorkspaceForm;
