import { useCallback, useEffect, useState } from "react";
import { Label, PullRequest } from "@octokit/webhooks-types";
import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { duration, githubClient, repoFromPrefs } from "../utils";

type PullRequestDisplay = PullRequest & {
  approvals: number;
};

export function PullRequests(props: { repo?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [navigation, setNavigation] = useState(props.repo);
  const [state, setState] = useState("open");
  const [pulls, setPulls] = useState<PullRequestDisplay[]>([]);
  const [withDetails, setWithDetails] = useCachedState<boolean>("with-details", false);
  const [showBot, setShowBot] = useCachedState<boolean>("show-bot", false);
  const [showBody, setShowBody] = useCachedState<boolean>("show-body", false);

  const getPullRequests = useCallback(
    async (state: string, page = 0) => {
      console.info(
        "Get pull requests [state=" + state + ", page=" + page + "] for " + (props.repo ? props.repo : "all")
      );
      setIsLoading(true);
      const filteredRepositories = repoFromPrefs().filter((repo) => !props.repo || repo.name === props.repo);
      try {
        const listPullsPromises = filteredRepositories.map((repo) =>
          githubClient.rest.pulls
            .list({
              owner: repo.owner.login,
              repo: repo.name,
              state: state as "open" | "closed" | "all",
              page: page,
              per_page: 20,
            })
            .then((value) => value.data as PullRequestDisplay[])
        );
        const allPulls = (await Promise.all(listPullsPromises))
          .flatMap((value) => value)
          .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
        setPulls(allPulls);

        // compute approvals
        const approvalByPull = new Map<PullRequestDisplay, number>();
        const approvalPromises = [];
        for (const pull of allPulls) {
          approvalPromises.push(
            githubClient.rest.pulls
              .listReviews({
                owner: pull.head.repo.owner.login,
                repo: pull.head.repo.name,
                pull_number: pull.number,
              })
              .then((value) => {
                let approvals = 0;
                for (const review of value.data) {
                  if (review.state === "APPROVED") {
                    approvals++;
                  }
                }
                if (approvals > 0) {
                  approvalByPull.set(pull, approvals);
                }
              })
          );
        }
        await Promise.all(approvalPromises);

        setPulls((prevState) => {
          for (const prevStateElement of prevState) {
            prevStateElement.approvals = approvalByPull.get(prevStateElement) || 0;
          }
          return prevState;
        });
      } catch (e) {
        console.error("Unable to list pull requests for : " + filteredRepositories, e);
      }
    },
    [props.repo]
  );

  useEffect(() => {
    getPullRequests(state).finally(() => setIsLoading(false));
  }, [getPullRequests, state]);

  const getPulls = useCallback(() => {
    return pulls.filter((pull) => pull.user.type !== "Bot" || showBot);
  }, [pulls, showBot]);

  const onChange = useCallback(
    (number: string | null) => {
      if (!number) {
        return;
      }
      for (const pull of pulls) {
        if (pull.number.toString() === number) {
          setNavigation(`#${pull.number} - ${pull.head.repo.owner.login}/${pull.head.repo.name}`);
        }
      }
    },
    [pulls]
  );

  const approve = useCallback(async (pull: PullRequestDisplay) => {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Approving #${pull.number}`,
    });

    try {
      if (
        await confirmAlert({
          title: `Do you really want to approve pull request #${pull.number} ?`,
          primaryAction: {
            title: "Approve",
            style: Alert.ActionStyle.Default,
          },
          icon: Icon.Check,
          dismissAction: {
            title: "Cancel",
            style: Alert.ActionStyle.Cancel,
          },
        })
      ) {
        await githubClient.rest.pulls
          .createReview({
            owner: pull.head.repo.owner.login,
            repo: pull.head.repo.name,
            pull_number: pull.number,
            event: "APPROVE",
          })
          .then((value) => value.data);

        toast.style = Toast.Style.Success;
        toast.message = `Approved with success`;
      } else {
        await toast.hide();
      }
    } catch (error) {
      console.error("Unable to approve #" + pull.number, error);
      toast.style = Toast.Style.Failure;
      toast.message = "Failed to approve #" + pull.number + "\n" + String(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <List
      filtering={true}
      isShowingDetail={withDetails && getPulls().length > 0}
      isLoading={isLoading}
      searchBarPlaceholder={"Search in pull requests"}
      navigationTitle={navigation}
      onSelectionChange={onChange}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter pull requests" value={state} onChange={(newValue) => setState(newValue)}>
          <List.Dropdown.Section title="State">
            <List.Dropdown.Item title="Open" value="open" />
            <List.Dropdown.Item title="Closed" value="closed" />
            <List.Dropdown.Item title="All" value="all" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={`No pull requests found${showBot ? "" : " (bot are not shown)"}`}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Navigation">
              <Action
                title={showBot ? "Hide bot PR" : "Show bot PR"}
                icon={showBot ? Icon.EyeDisabled : Icon.Eye}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => setShowBot(!showBot)}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
      {getPulls().map((pull) => (
        <List.Item
          id={`${pull.number}`}
          key={pull.number}
          title={
            !pull.draft
              ? {
                  value: pull.title,
                  tooltip: pull.approvals > 0 ? "Approved" : pull.user.type === "Bot" ? "Bot pull request" : "",
                }
              : ""
          }
          subtitle={
            pull.draft
              ? {
                  value: pull.title,
                  tooltip: pull.draft ? "Draft" : "",
                }
              : ""
          }
          icon={
            pull.draft
              ? {
                  source: Icon.CircleProgress25,
                  tintColor: Color.SecondaryText,
                }
              : pull.merged_at
              ? {
                  source: Icon.CircleProgress100,
                  tintColor: Color.Purple,
                }
              : pull.closed_at
              ? {
                  source: Icon.CircleProgress100,
                  tintColor: Color.Red,
                }
              : pull.approvals > 0
              ? {
                  source: Icon.CheckCircle,
                  tintColor: Color.Green,
                }
              : pull.user.type === "Bot"
              ? {
                  source: Icon.ComputerChip,
                  tintColor: Color.Blue,
                }
              : {
                  source: Icon.Clock,
                  tintColor: Color.Orange,
                }
          }
          keywords={[`${pull.number}`]}
          accessories={
            withDetails
              ? []
              : [
                  { text: duration(pull.created_at) },
                  { text: `#${pull.number}` },
                  {
                    icon: {
                      source: Icon.Tag,
                      tintColor: pull.labels.length ? Color.Green : Color.Red,
                    },
                    tooltip: pull.labels.length ? pull.labels.map(({ name }) => name).join(" ") : "no labels",
                  },
                  {
                    icon: {
                      source: pull.user.avatar_url,
                      mask: Image.Mask.Circle,
                    },
                    tooltip: pull.user.login,
                  },
                ]
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Navigation">
                <Action.OpenInBrowser
                  title="Open"
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "o",
                  }}
                  url={pull.html_url}
                />
                <Action.OpenInBrowser
                  title="Begin review"
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  url={pull.html_url + "/files"}
                />
                <Action
                  icon={Icon.Check}
                  title="Approve"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  onAction={() => approve(pull)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Display">
                <Action
                  title={withDetails ? "Hide details panel" : "Show details panel"}
                  icon={withDetails ? Icon.EyeDisabled : Icon.Eye}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                  onAction={() => setWithDetails(!withDetails)}
                />
                {withDetails && (
                  <Action
                    title={showBody ? "Hide body" : "Show body"}
                    icon={showBody ? Icon.EyeDisabled : Icon.Eye}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    onAction={() => setShowBody(!showBody)}
                  />
                )}
                <Action
                  title={showBot ? "Hide bot PR" : "Show bot PR"}
                  icon={showBot ? Icon.EyeDisabled : Icon.Eye}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                  onAction={() => setShowBot(!showBot)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Copy">
                <Action.CopyToClipboard
                  icon={Icon.CopyClipboard}
                  title="Copy url"
                  shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                  content={pull.html_url}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={showBody ? pull.body : undefined}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Owner" text={pull.head.repo.owner.login} />
                  <List.Item.Detail.Metadata.Label title="Repo" text={pull.head.repo.name} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Title" text={pull.title} />
                  <List.Item.Detail.Metadata.Label title="Branch" text={pull.head.ref} />
                  <List.Item.Detail.Metadata.TagList title="Number">
                    <List.Item.Detail.Metadata.TagList.Item text={`${pull.number}`} color={"#35dfee"} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="State" text={pull.state} />
                  <List.Item.Detail.Metadata.Label title="Draft" text={`${pull.draft}`} />
                  <List.Item.Detail.Metadata.Label
                    title="Creator"
                    text={pull.user.login}
                    icon={{
                      source: pull.user.avatar_url,
                      mask: Image.Mask.Circle,
                    }}
                  />
                  {pull.approvals !== undefined && <List.Item.Detail.Metadata.Separator />}
                  {pull.approvals !== undefined && (
                    <List.Item.Detail.Metadata.Label title="Approvals" text={`${pull.approvals}`} />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Labels">
                    {pull.labels.map((label: Label) => (
                      <List.Item.Detail.Metadata.TagList.Item
                        key={label.id}
                        text={`${label.name}`}
                        color={`#${label.color}`}
                      />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Creation" text={duration(pull.created_at)} />
                  <List.Item.Detail.Metadata.Label title="Updated" text={duration(pull.updated_at)} />
                  {pull.merged_at && <List.Item.Detail.Metadata.Label title="Merged" text={duration(pull.merged_at)} />}
                  {pull.closed_at && <List.Item.Detail.Metadata.Label title="Closed" text={duration(pull.closed_at)} />}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
