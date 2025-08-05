import { MERGE_PR } from "@/queries/pull-requests";
import { fetcher } from "@/utils";
import { Color, popToRoot, showToast, Action, Keyboard, Toast } from "@raycast/api";
import { useSWRConfig } from "swr";

type MergePROwnProps = {
  id: string;
  method?: "MERGE" | "REBASE" | "SQUASH";
  number: number;
  shortcut?: Keyboard.Shortcut;
  title: string;
};

export default function MergePR(props: MergePROwnProps) {
  const { id, method = "MERGE", number, shortcut, title } = props;
  const { mutate } = useSWRConfig();

  async function mergePR() {
    showToast({
      style: Toast.Style.Animated,
      title: "Merging pull request",
    });

    try {
      await fetcher({
        document: MERGE_PR,
        variables: {
          pullRequestId: id,
          mergeMethod: method,
        },
      });

      mutate("prs");
      mutate("prs-open");
      showToast({
        style: Toast.Style.Success,
        title: `Pull request #${number} merged`,
      });
      popToRoot();
    } catch (error: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to merge pull request",
        message: error instanceof Error ? error.message : error.toString(),
      });
    }
  }

  return (
    <Action
      title={title}
      icon={{
        source: "pull-request-merge.png",
        tintColor: Color.PrimaryText,
      }}
      shortcut={shortcut}
      onAction={mergePR}
    />
  );
}
