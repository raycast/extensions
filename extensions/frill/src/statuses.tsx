import { useEffect, useState } from "react";
import { CreateStatusRequest, GetStatusesResponse, Status, UpdateStatusRequest } from "./types/statuses";
import { createStatus, deleteStatus, getStatuses, updateStatus } from "./lib/api";
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
import ErrorComponent from "./components/ErrorComponent";
import { FormValidation, useForm } from "@raycast/utils";
import { ErrorResponse } from "./types";

export default function Statuses() {
  const [isLoading, setIsLoading] = useState(true);
  const [statusesResponse, setStatusesResponse] = useState<GetStatusesResponse>();
  const [filter, setFilter] = useState("");
  const [filteredStatuses, filterStatuses] = useState<Status[]>();
  const [errorResponse, setErrorResponse] = useState<ErrorResponse>();

  async function getStatusesFromApi() {
    setIsLoading(true);
    const response = await getStatuses();
    if ("data" in response) {
      setStatusesResponse(response);
      await showToast({
        title: "SUCCESS",
        message: `Fetched ${response.data.length} statuses`,
      });
    } else setErrorResponse(response);
    setIsLoading(false);
  }

  useEffect(() => {
    getStatusesFromApi();
  }, []);

  useEffect(() => {
    (() => {
      if (!statusesResponse) return;
      filterStatuses(
        statusesResponse.data.filter((status) => {
          if (filter === "") return status;
          if (filter === "is_completed" && status.is_completed) return status;
          if (filter === "is_incompleted" && !status.is_completed) return status;
        }),
      );
    })();
  }, [statusesResponse, filter]);

  async function confirmAndDeleteStatus(status: Status) {
    if (
      await confirmAlert({
        title: `Delete status '${status.name}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const response = await deleteStatus(status.idx);
      if ("success" in response) {
        await showToast(Toast.Style.Success, "SUCCESS", `Deleted status '${status.name}`);
        await getStatusesFromApi();
      }
    }
  }

  return errorResponse ? (
    <ErrorComponent response={errorResponse} />
  ) : (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search status"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item title="All" icon={Icon.CircleProgress100} value="" />
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item
              title="Completed"
              icon={{ source: Icon.Check, tintColor: Color.Green }}
              value="is_completed"
            />
            <List.Dropdown.Item
              title="Incompleted"
              icon={{ source: Icon.Multiply, tintColor: Color.Red }}
              value="is_incompleted"
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredStatuses?.map((status) => (
        <List.Item
          key={status.idx}
          title={status.name}
          icon={{ source: Icon.Circle, tintColor: status.color }}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="IDx" text={status.idx} />
                  <List.Item.Detail.Metadata.Label title="Name" text={status.name} />
                  <List.Item.Detail.Metadata.Label
                    title="Created At"
                    text={status.created_at || ""}
                    icon={status.created_at ? undefined : Icon.Minus}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Updated At"
                    text={status.updated_at || ""}
                    icon={status.updated_at ? undefined : Icon.Minus}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Is Completed"
                    icon={status.is_completed ? Icon.Check : Icon.Multiply}
                  />
                  <List.Item.Detail.Metadata.TagList title="Color">
                    <List.Item.Detail.Metadata.TagList.Item text={status.color} color={status.color} />
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Update Status"
                icon={Icon.Pencil}
                target={<UpdateStatus initialStatus={status} onStatusUpdated={getStatusesFromApi} />}
              />
              <Action
                title="Delete Status"
                style={Action.Style.Destructive}
                icon={Icon.DeleteDocument}
                onAction={() => confirmAndDeleteStatus(status)}
              />
              <ActionPanel.Section>
                <Action.Push
                  title="Create New Status"
                  icon={Icon.Plus}
                  target={<CreateNewStatus onStatusCreated={getStatusesFromApi} />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create New Status"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create New Status"
                  icon={Icon.Plus}
                  target={<CreateNewStatus onStatusCreated={getStatusesFromApi} />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type CreateNewStatusProps = {
  onStatusCreated: () => void;
};
export function CreateNewStatus({ onStatusCreated }: CreateNewStatusProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<CreateStatusRequest>({
    async onSubmit(values) {
      setIsLoading(true);
      const params = values;
      if (!values.color) delete params.color;

      const response = await createStatus(params);

      if ("data" in response) {
        await showToast(Toast.Style.Success, "SUCCESS", "Created Status");
        onStatusCreated();
        pop();
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Status"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="New Status" {...itemProps.name} />
      {/* COLOR PICKER */}
      <Form.Checkbox
        label='Is "Completed" Status'
        {...itemProps.is_completed}
        info="Ideas with the Completed status will be hidden from the Ideas board"
      />
    </Form>
  );
}

type UpdateStatusProps = {
  initialStatus: Status;
  onStatusUpdated: () => void;
};
export function UpdateStatus({ initialStatus, onStatusUpdated }: UpdateStatusProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const [errorResponse, setErrorResponse] = useState<ErrorResponse>();

  const { handleSubmit, itemProps } = useForm<UpdateStatusRequest>({
    async onSubmit(values) {
      setIsLoading(true);
      const params = values;

      const response = await updateStatus(initialStatus.idx, params);

      if ("data" in response) {
        await showToast(Toast.Style.Success, "SUCCESS", "Updated Status");
        onStatusUpdated();
        pop();
      } else setErrorResponse(response);
    },
    validation: {
      name: FormValidation.Required,
      color(value) {
        if (!value) return "The item is required";
        else if (!value.includes("#") || !(value.length === 7)) return "The item must be an RGB Hex";
      },
    },
    initialValues: {
      name: initialStatus.name,
      color: initialStatus.color,
      is_completed: initialStatus.is_completed,
    },
  });

  return errorResponse ? (
    <ErrorComponent response={errorResponse} />
  ) : (
    <Form
      isLoading={isLoading}
      navigationTitle="Update Status"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Updated Status" {...itemProps.name} />
      <Form.TextField title="Color" placeholder="#fff" {...itemProps.color} info="Please use Hex RGB format" />
      <Form.Checkbox
        label='Is "Completed" Status'
        {...itemProps.is_completed}
        info="Ideas with the Completed status will be hidden from the Ideas board"
      />
    </Form>
  );
}
