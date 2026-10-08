import { List, Icon, ActionPanel, Action, confirmAlert, Color, Alert, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { FORMIZEE_URL, FORMIZEE_HEADERS, parseFormizeeResponse } from "./formizee";
import { Endpoint, Submission } from "./types";

export default function Submissions({ form }: { form: Endpoint }) {
  const {
    isLoading,
    data: submissions,
    mutate,
  } = useFetch(FORMIZEE_URL + "submissions/" + form.id, {
    headers: FORMIZEE_HEADERS,
    mapResult(result: { submissions: Submission[] }) {
      return {
        data: result.submissions,
      };
    },
    initialData: [],
  });
  return (
    <List isLoading={isLoading} navigationTitle={`Search Forms / ${form.name} / Submissions`} isShowingDetail>
      {!isLoading && !submissions.length ? (
        <List.EmptyView
          icon={Icon.Document}
          title="There's no submissions yet"
          description="Looks empty? Check the documentation to learn how to start receiving submissions."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.ArrowNe} title="See Docs" url="https://docs.formizee.com/" />
            </ActionPanel>
          }
        />
      ) : (
        submissions.map((submission) => (
          <List.Item
            key={submission.id}
            icon={Icon.Text}
            title={submission.id}
            detail={
              <List.Item.Detail
                markdown={`\`\`\`${JSON.stringify(submission.data)}\`\`\``}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Read" icon={submission.isRead ? Icon.Check : Icon.Xmark} />
                    <List.Item.Detail.Metadata.Label title="Spam" icon={submission.isSpam ? Icon.Check : Icon.Xmark} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Xmark}
                  title="Delete Submission"
                  onAction={() =>
                    confirmAlert({
                      icon: { source: Icon.Trash, tintColor: Color.Red },
                      title: "Delete Submission",
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Delete Permanently",
                        async onAction() {
                          const toast = await showToast(Toast.Style.Animated, "Deleting", submission.id);
                          try {
                            await mutate(
                              fetch(FORMIZEE_URL + `submission/${submission.endpointId}/${submission.id}`, {
                                method: "DELETE",
                                headers: FORMIZEE_HEADERS,
                              }).then(parseFormizeeResponse),
                              {
                                optimisticUpdate(data) {
                                  return data.filter((s) => s.id !== submission.id);
                                },
                                shouldRevalidateAfter: false,
                              },
                            );
                            toast.style = Toast.Style.Success;
                            toast.title = "Deleted";
                          } catch (error) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed";
                            toast.message = `${error}`;
                          }
                        },
                      },
                    })
                  }
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
