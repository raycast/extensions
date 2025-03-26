import { showToast, Toast, popToRoot, Detail, ActionPanel, Action, Icon, confirmAlert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback } from "react";
import { Essay } from "../types";
import useEssayStore from "../stores/essay-store";
import EssayForm from "./essay-form";

export function EssayDetail({ essay }: { essay: Essay }) {
  const { deleteEssay } = useEssayStore();
  const onDelete = useCallback(
    async (essayId: string) => {
      try {
        await deleteEssay(essayId);
        showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: "Essay deleted",
        });
        popToRoot();
      } catch (err: unknown) {
        showFailureToast(err, { title: "Fail to delete essay, please check your API key and try again." });
      }
    },
    [deleteEssay],
  );
  return (
    <Detail
      markdown={essay.content}
      actions={
        <ActionPanel title={essay.content.substring(0, 20)}>
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="Open in Browser"
            url={`https://www.essay.ink/essays/${essay.id}`}
          />
          <Action.Push icon={Icon.Pencil} title="Edit" target={<EssayForm essay={essay} />} />
          <Action
            icon={Icon.Trash}
            title="Delete"
            onAction={async () => {
              if (await confirmAlert({ title: "Are you sure?" })) {
                onDelete(essay.id);
              } else {
                showToast({
                  title: "Canceled",
                });
              }
            }}
            style={Action.Style.Destructive}
          />
        </ActionPanel>
      }
    />
  );
}
