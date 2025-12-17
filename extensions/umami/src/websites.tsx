import { Action, ActionPanel, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
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
    const { error, data } = await umami.getWebsites();
    handleUmamiError(error);
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
    <List isLoading={isLoading}>
      {websites && !websites.length && (
        <List.EmptyView
          title="Add your website to get started."
          icon="placeholder.png"
          actions={
            <ActionPanel>
              <Action.Push title="Add Website" icon={Icon.Plus} target={<AddWebsite />} onPop={mutate} />
            </ActionPanel>
          }
        />
      )}
      {websites.map((website) => (
        <List.Item
          key={website.id}
          icon={getFavicon(`https://${website.domain}`)}
          title={website.name}
          subtitle={website.domain}
          accessories={[{ icon: Icon.Number24, text: `${website.stats?.pageviews.value || 0}`, tooltip: "24h" }]}
          actions={
            <ActionPanel>
              <Action.Push title="Add Website" icon={Icon.Plus} target={<AddWebsite />} onPop={mutate} />
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
        const { error } = await umami.createWebsite(values);
        handleUmamiError(error);
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
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
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
