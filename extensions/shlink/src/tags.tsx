import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { apiFetch, hashedHSL, HealthCheck, useApiFetchPaginationExtract } from "./shared";
import { useState } from "react";
import Visits from "./visits";

interface TagObject {
  tag: string;
  shortUrlsCount: number;
  visitsSummary: {
    total: number;
    nonBots: number;
    bots: number;
  };
}

export default function Command() {
  const [healthCheck, setHealthCheck] = useState<boolean>(false);

  const { isLoading, data: items, revalidate } = useApiFetchPaginationExtract<TagObject>("tags/stats", "tags");
  const { push } = useNavigation();

  return (
    <HealthCheck onLoading={setHealthCheck} renderWhileLoading>
      <List
        isLoading={healthCheck || isLoading}
        navigationTitle="Search Tags"
        searchBarPlaceholder="Search your tags"
        filtering
      >
        {items?.length ? (
          <List.Section title="Short URLs" subtitle={items?.length.toString()}>
            {items.map((item) => (
              <List.Item
                icon={{ source: Icon.Tag, tintColor: hashedHSL(item.tag) }}
                key={item.tag}
                title={item.tag}
                accessories={[
                  {
                    text: item.shortUrlsCount.toString(),
                    tooltip: "Short URLs count",
                    icon: { source: Icon.Link },
                  },
                  {
                    text: item.visitsSummary.total.toString(),
                    tooltip: "Total Visits",
                    icon: { source: "👀" },
                  },
                  {
                    text: item.visitsSummary.bots.toString(),
                    tooltip: "Bots count + Non-Bots count",
                    icon: { source: "🤖" },
                  },
                  {
                    text: item.visitsSummary.nonBots.toString(),
                    tooltip: "Non-Bots count",
                    icon: { source: "💁" },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Visits"
                      icon={{ source: Icon.Eye }}
                      onAction={() =>
                        push(
                          <Visits
                            item={{
                              type: "tags",
                              value: item.tag,
                              title: `Visits by "${item.tag}" Tag`,
                              placeholder: `Search Visits by "${item.tag}" Tag...`,
                            }}
                          />
                        )
                      }
                    />
                    <Action.Push title="Edit Tag" icon={{ source: Icon.Pencil }} target={<EditTag tag={item.tag} />} />
                    <Action title="Refresh Data" icon={{ source: Icon.Repeat }} onAction={revalidate} />
                    <Action
                      title="Delete Tag"
                      icon={{ source: Icon.XMarkCircle }}
                      shortcut={{ key: "delete", modifiers: ["cmd"] }}
                      style={Action.Style.Destructive}
                      onAction={() => deleteTag({ tag: item.tag, revalidate })}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView
            actions={
              <ActionPanel>
                <Action title="Refresh Data" icon={{ source: Icon.Repeat }} onAction={revalidate} />
              </ActionPanel>
            }
            title="No Tags Found"
            icon={{ source: Icon.Tag }}
          />
        )}
      </List>
    </HealthCheck>
  );
}

function deleteTag({ tag, revalidate }: { tag: string; revalidate: () => void }) {
  async function onAction() {
    const toast = await showToast({
      title: `Deleting "${tag}"...`,
      style: Toast.Style.Animated,
    });

    try {
      const { response, text } = await apiFetch({
        restPath: `tags?tags[]=${tag}`,
        method: "DELETE",
      });
      if (response.ok) {
        toast.style = Toast.Style.Success;
        toast.title = `Deleted "${tag}"!`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to delete "${tag}" (${response.statusText})!`;
        toast.message = text;
      }
      revalidate?.();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to delete "${tag}"!`;
      toast.message = e?.toString();
    }
  }

  return confirmAlert({
    title: "Are you sure you want to delete this tag?",
    icon: { source: Icon.DeleteDocument, tintColor: Color.Red },

    primaryAction: {
      title: "Delete Tag",
      style: Alert.ActionStyle.Destructive,
      onAction,
    },
  });
}

function EditTag({ tag }: { tag: string }) {
  const { pop } = useNavigation();

  const { itemProps, handleSubmit } = useForm<{ tag: string }>({
    initialValues: {
      tag,
    },
    onSubmit: async (formData) => {
      const toast = await showToast({
        title: `Updating "${tag}"...`,
        style: Toast.Style.Animated,
      });

      try {
        const { response, text } = await apiFetch({
          restPath: `tags?tags[]=${tag}`,
          method: "PUT",
          data: JSON.stringify({
            oldName: tag,
            newName: formData.tag,
          }),
        });
        if (response.ok) {
          toast.style = Toast.Style.Success;
          toast.title = `Tag "${tag}" Updated to "${formData.tag}"!`;
          return pop();
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed to update "${tag}" (${response.statusText})!`;
          toast.message = text;
        }
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to update "${tag}"!`;
        toast.message = e?.toString();
      }
    },
    validation: {
      tag: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle={`Edit "${tag}" Tag`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Tag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Old Tag Name" text={tag} />
      <Form.TextField autoFocus title="New Tag Name" {...itemProps.tag} />
    </Form>
  );
}
