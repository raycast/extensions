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
        showFailureToast(err, {
          title: "Failed to delete essay, please check your API key, API endpoint and try again.",
        });
      }
    },
    [deleteEssay],
  );
  return (
    <Detail
      markdown={essay.content}
      actions={
        <ActionPanel>
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
              if (await confirmAlert({ title: "Are you sure you want to delete this essay?" })) {
                showToast({
                  style: Toast.Style.Animated,
                  title: "Deleting the essay...",
                });
                onDelete(essay.id);
              } else {
                showToast({
                  style: Toast.Style.Success,
                  title: "Canceled",
                  message: "Essay not deleted",
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
