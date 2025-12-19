import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { umami } from "./lib/umami";
import { AddWebsiteFormValues } from "./lib/types";
import { FormValidation, getFavicon, useCachedPromise, useForm } from "@raycast/utils";
import WithUmami from "./components/WithUmami";
import { handleUmamiError } from "./lib/utils";

export default function Main() {
  return (
    <WithUmami>
      <Websites />
    </WithUmami>
  );
}

function Websites() {
  const {
    isLoading,
    data: websites = [],
    mutate,
  } = useCachedPromise(async () => {
    const { ok, error, data } = await umami.getWebsites();
    if (!ok) handleUmamiError(error);
    const websites = data?.data ?? [];
    const endAt = Date.now();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // 1 day ago
    const startAt = pastDate.getTime();

    const date = new Date();
    date.setMinutes(date.getMinutes() - 30);

    const statsResponses = await Promise.all(
      websites.map((website) => umami.getWebsiteStats(website.id, { startAt, endAt })),
    );
    const stats = statsResponses.map(({ data }) => data);
    return websites.map((website, index) => ({ ...website, stats: stats[index] }));
  });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {websites && !websites.length && (
        <List.EmptyView
          title="Add your website to get started."
          icon="placeholder.png"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Add Website" target={<AddWebsite />} onPop={mutate} />
            </ActionPanel>
          }
        />
      )}
      {websites.map((website) => (
        <List.Item
          key={website.id}
          icon={getFavicon(`https://${website.domain}`)}
          title={website.name}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  {website.stats && (
                    <>
                      <List.Item.Detail.Metadata.Label title="Stats" />
                      <List.Item.Detail.Metadata.Label title="Bounces" text={`${website.stats.bounces.value || 0}`} />
                      <List.Item.Detail.Metadata.Label
                        title="Page Views"
                        text={`${website.stats.pageviews.value || 0}`}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Total Time"
                        text={`${website.stats.totaltime.value || 0}`}
                      />
                      <List.Item.Detail.Metadata.Label title="Visitors" text={`${website.stats.visitors.value || 0}`} />
                      <List.Item.Detail.Metadata.Label title="Visits" text={`${website.stats.visits.value || 0}`} />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push title="Add Website" icon={Icon.Plus} target={<AddWebsite />} onPop={mutate} />
              <Action
                icon={Icon.Trash}
                title="Delete Website"
                onAction={() =>
                  confirmAlert({
                    icon: { source: Icon.Trash, tintColor: Color.Red },
                    title: "Delete Website",
                    primaryAction: {
                      style: Alert.ActionStyle.Destructive,
                      title: "Delete",
                      async onAction() {
                        const toast = await showToast(Toast.Style.Animated, "Deleting", website.name);
                        try {
                          await mutate(
                            umami.deleteWebsite(website.id).then(({ ok, error }) => {
                              if (!ok) handleUmamiError(error);
                            }),
                            {
                              optimisticUpdate(data) {
                                return data?.filter((w) => w.id !== website.id);
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
      ))}
    </List>
  );
}

function AddWebsite() {
  const { pop } = useNavigation();
  const { itemProps, handleSubmit, values } = useForm<AddWebsiteFormValues>({
    async onSubmit() {
      const toast = await showToast(Toast.Style.Animated, "Adding", values.name);
      try {
        const { ok, error } = await umami.createWebsite(values);
        if (!ok) handleUmamiError(error);
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      domain: FormValidation.Required,
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Add Website"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add Website" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Domain"
        placeholder="https://example.com"
        info="The full domain of the tracked website"
        {...itemProps.domain}
      />
      <Form.TextField
        title="Name"
        placeholder="Example Website"
        info="The name of the website in Umami"
        {...itemProps.name}
      />
    </Form>
  );
}
