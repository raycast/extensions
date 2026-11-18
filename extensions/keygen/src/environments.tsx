import dayjs from "dayjs";
import relatimeTime from "dayjs/plugin/relativeTime";
import { API_URL, headers, parseResponse, useKeygenPaginated } from "./keygen";
import { Environment } from "./interfaces";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
dayjs.extend(relatimeTime);

export default function Environments() {
  const { isLoading, data: environments, pagination, error, mutate } = useKeygenPaginated<Environment>("environments");

  async function confirmAndDelete(environment: Environment) {
    const options: Alert.Options = {
      title: "Are you absolutely sure?",
      message: "This action cannot be undone. This will permanently delete the environment.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting Environment", environment.attributes.name);
      try {
        await mutate(
          fetch(API_URL + `environments/${environment.id}`, {
            method: "DELETE",
            headers,
          }).then(parseResponse),
          {
            optimisticUpdate(data) {
              return data.filter((e) => e.id !== environment.id);
            },
            shouldRevalidateAfter: false,
          },
        );
        toast.style = Toast.Style.Success;
        toast.title = "Deleted Environment";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not delete";
        toast.message = `${error}`;
      }
    }
  }

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {!isLoading && !environments.length && !error ? (
        <List.EmptyView
          description="No results"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="New Environment" target={<NewEnvironment onNew={mutate} />} />
            </ActionPanel>
          }
        />
      ) : (
        environments.map((environment) => (
          <List.Item
            key={environment.id}
            icon={Icon.Tree}
            title={environment.attributes.name}
            subtitle={environment.attributes.code}
            accessories={[{ tag: environment.attributes.isolationStrategy }]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Plus} title="New Environment" target={<NewEnvironment onNew={mutate} />} />

                <Action
                  icon={Icon.Trash}
                  title="Delete"
                  onAction={() => confirmAndDelete(environment)}
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

function NewEnvironment({ onNew }: { onNew: () => void }) {
  const { pop } = useNavigation();

  interface FormValues {
    name: string;
    code: string;
    isolationStrategy: string;
  }
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Environment", values.name);

      const attributes: Partial<Environment["attributes"]> = {
        ...values,
        isolationStrategy: values.isolationStrategy as Environment["attributes"]["isolationStrategy"],
      };

      const body = {
        data: {
          type: "environments",
          attributes,
        },
      };

      try {
        const response = await fetch(API_URL + "environments", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        await parseResponse(response);
        toast.style = Toast.Style.Success;
        toast.title = "Created Environment";
        onNew();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      isolationStrategy: "ISOLATED",
    },
    validation: {
      name: FormValidation.Required,
      code: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Attributes" />
      <Form.TextField title="Name" placeholder="Sandbox" info="The name of the environment." {...itemProps.name} />
      <Form.TextField
        title="Code"
        placeholder="sandbox"
        info="The unique code for the environment. The code cannot collide with any environments that already exist."
        {...itemProps.code}
      />
      <Form.Dropdown
        title="Isolation Strategy"
        info="The strategy used for isolating the environment from other environments."
        {...itemProps.isolationStrategy}
      >
        <Form.Dropdown.Item title="ISOLATED" value="ISOLATED" />
        <Form.Dropdown.Item title="SHARED" value="SHARED" />
      </Form.Dropdown>
    </Form>
  );
}
