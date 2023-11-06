import { List, ActionPanel, Action, showToast, Toast, getPreferenceValues, Form } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getDatabasesList, connectToDatabase } from "./utils";

async function open(name: string, protocol: string, database: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Connecting...",
  });

  const prefs = getPreferenceValues();

  try {
    await connectToDatabase(name, prefs.username, protocol, database);
    toast.style = Toast.Style.Success;
    toast.title = "Success !";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failure !";
  }
}

function DatabaseForm(props: { name: string; protocol: string }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: { database: string }) => {
              return open(props.name, props.protocol, values.database);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="database" title="Database" />
    </Form>
  );
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(getDatabasesList);

  return (
    <List isLoading={isLoading}>
      {data?.map((item: { metadata: { name: string }; spec: { protocol: string } }, index: number) => {
        const name = item.metadata.name;
        const protocol = item.spec.protocol;

        return (
          <List.Item
            key={name + index}
            title={name}
            subtitle={protocol}
            actions={
              <ActionPanel>
                <Action title="Open" onAction={() => open(name, protocol, "")} />
                <Action.Push title="Open With Database" target={<DatabaseForm name={name} protocol={protocol} />} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
