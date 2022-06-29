import { ActionPanel, List, Color, Image } from "@raycast/api";
import { MergeRequest, Project } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { gitlab } from "../common";
import { daysInSeconds, ensureCleanAccessories, showErrorToast, toDateString } from "../utils";
import { DefaultActions, GitLabOpenInBrowserAction } from "./actions";
import { ShowReviewMRAction } from "./review_actions";
import { getCIJobStatusEmoji } from "./jobs";
import { useCache } from "../cache";
import { useEffect, useState } from "react";
import { MyProjectsDropdown } from "./project";
import { useMRPipelines } from "./mr";

export function ReviewList(): JSX.Element {
  const [project, setProject] = useState<Project>();
  const { mrs, error, isLoading } = useMyReviews(project);

  if (error) {
    showErrorToast(error, "Cannot search Reviews");
  }

  if (isLoading === undefined) {
    return <List isLoading={true} searchBarPlaceholder="" />;
  }

  return (
    <List
      searchBarPlaceholder="Filter Reviews by name..."
      isLoading={isLoading}
      searchBarAccessory={<MyProjectsDropdown onChange={setProject} />}
    >
      {mrs?.map((mr) => (
        <ReviewListItem key={mr.id} mr={mr} />
      ))}
    </List>
  );
}

function ReviewListItem(props: { mr: MergeRequest }) {
  const mr = props.mr;
  const subtitle: string[] = [`!${mr.iid}`];
  const { mrpipelines } = useMRPipelines(mr);
  if (mrpipelines && mrpipelines.length > 0) {
    const ciStatusEmoji = getCIJobStatusEmoji(mrpipelines[0].status);
    if (ciStatusEmoji) {
      subtitle.push(ciStatusEmoji);
    }
  }
  const accessoryIcon: Image.ImageLike | undefined = { source: mr.author?.avatar_url || "", mask: Image.Mask.Circle };
  return (
    <List.Item
      id={mr.id.toString()}
      title={mr.title}
      subtitle={subtitle.join("    ")}
      icon={{ source: GitLabIcons.mropen, tintColor: Color.Green }}
      accessories={ensureCleanAccessories([{ text: toDateString(mr.updated_at) }, { icon: accessoryIcon }])}
      actions={
        <ActionPanel>
          <DefaultActions
            action={<ShowReviewMRAction mr={mr} />}
            webAction={<GitLabOpenInBrowserAction url={mr.web_url} />}
          />
        </ActionPanel>
      }
    />
  );
}

function useMyReviews(project?: Project | undefined): {
  mrs: MergeRequest[] | undefined;
  isLoading: boolean | undefined;
  error: string | undefined;
  performRefetch: () => void;
} {
  const [mrs, setMrs] = useState<MergeRequest[]>();
  const { data, isLoading, error, performRefetch } = useCache<MergeRequest[] | undefined>(
    `myreviews`,
    async (): Promise<MergeRequest[] | undefined> => {
      const user = await gitlab.getMyself();
      const glMRs = await gitlab.getMergeRequests({
        state: "opened",
        reviewer_id: user.id,
        in: "title",
        scope: "all",
      });
      return glMRs;
    },
    {
      deps: [],
      secondsToRefetch: 1,
      secondsToInvalid: daysInSeconds(7),
    }
  );
  useEffect(() => {
    const filtered = project ? data?.filter((m) => m.project_id === project?.id) : data;
    setMrs(filtered || []);
  }, [data, project]);
  return { mrs, isLoading, error, performRefetch };
}
