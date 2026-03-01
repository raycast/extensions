import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { featurebase } from "./featurebase";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Grid,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { ChangelogState, CreateChangelogRequest } from "./types";
import { useState } from "react";

export default function ManageChangelogs() {
  const [state, setState] = useState("live");
  const {
    isLoading,
    data: changelogs,
    pagination,
    mutate,
  } = useCachedPromise(
    (state) => async (options) => {
      const result = await featurebase.changelog.list({ page: options.page + 1, state });
      return {
        data: result.results,
        hasMore: result.totalResults > result.page * result.limit,
      };
    },
    [state],
    { initialData: [] },
  );

  return (
    <Grid
      isLoading={isLoading}
      pagination={pagination}
      columns={4}
      searchBarAccessory={
        <Grid.Dropdown tooltip="State" onChange={setState} storeValue>
          <Grid.Dropdown.Item icon={Icon.Livestream} title="Published" value="live" />
          <Grid.Dropdown.Item icon={Icon.Bookmark} title="Draft" value="draft" />
        </Grid.Dropdown>
      }
    >
      {!isLoading && !changelogs.length ? (
        <Grid.EmptyView
          title="Get started with the Changelog"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="New Changelog" target={<NewChangelog />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ) : (
        changelogs.map((changelog) => (
          <Grid.Item
            key={changelog.id}
            content={changelog.featuredImage || "#24283880"}
            title={changelog.title}
            subtitle={new Date(changelog.date).toDateString()}
            accessory={{ icon: changelog.state === ChangelogState.Draft ? Icon.Bookmark : Icon.Livestream }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={`https://${changelog.organization}.featurebase.app/dashboard/changelog/${changelog.id}`}
                />
                <Action.Push icon={Icon.Plus} title="New Changelog" target={<NewChangelog />} onPop={mutate} />
                <Action
                  icon={Icon.Trash}
                  title="Delete Changelog"
                  onAction={() =>
                    confirmAlert({
                      icon: { source: Icon.Warning, tintColor: Color.Red },
                      title: "Are you sure you want to delete this changelog?",
                      message: "This action cannot be undone.",
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Delete",
                        async onAction() {
                          const toast = await showToast(Toast.Style.Animated, "Deleting", changelog.title);
                          try {
                            await mutate(featurebase.changelog.delete({ id: changelog.id }), {
                              optimisticUpdate(data) {
                                return data.filter((c) => c.id !== changelog.id);
                              },
                              shouldRevalidateAfter: false,
                            });
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
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}

function NewChangelog() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CreateChangelogRequest>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.title);
      try {
        const result = await featurebase.changelog.create(values);
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        toast.message = result.changelog.title;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      title: FormValidation.Required,
      markdownContent: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="New Changelog" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Untitled changelog" {...itemProps.title} />
      <Form.TextArea
        title="Markdown Content"
        placeholder="Click here to start writing"
        info="For images, you can use external URLs in img src attributes and our system will automatically pull them into our own storage. If no external URL is available, we also support base64 encoded data URIs (data:image/...) in img src attributes, which will also be processed and stored in our system."
        enableMarkdown
        {...itemProps.markdownContent}
      />
    </Form>
  );
}
