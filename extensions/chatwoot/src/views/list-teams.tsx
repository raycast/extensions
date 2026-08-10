import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { chatwoot } from "../chatwoot";
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
import { Team } from "../types";

export default function ListTeams() {
  const {
    isLoading,
    data: teams,
    mutate,
  } = useCachedPromise(
    async () => {
      const payload = await chatwoot.teams.list();
      return payload;
    },
    [],
    { initialData: [] },
  );

  function confirmAndDelete(team: Team) {
    confirmAlert({
      icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
      title: "Are you sure you want to delete the team?",
      message: "Deleting the team will remove the team assignment from the conversations assigned to this team.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
        async onAction() {
          const toast = await showToast(Toast.Style.Animated, "Deleting", `${team.id}`);
          try {
            await mutate(chatwoot.teams.delete({ teamId: team.id }), {
              optimisticUpdate(data) {
                return data.filter((t) => t.id !== team.id);
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
    });
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !teams.length ? (
        <List.EmptyView
          description="There are no teams created on this account."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.PlusCircle} title="Create New Team" target={<AddTeam />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ) : (
        teams.map((team) => (
          <List.Item
            key={team.id}
            icon={Icon.TwoPeople}
            title={team.name}
            subtitle={team.description}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.PlusCircle} title="Create New Team" target={<AddTeam />} onPop={mutate} />
                <Action
                  icon={Icon.XMarkCircle}
                  title="Delete Team"
                  onAction={() => confirmAndDelete(team)}
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

function AddTeam() {
  const { pop } = useNavigation();
  type FormValues = {
    name: string;
    description: string;
    allow_auto_assign: boolean;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding", values.name);
      try {
        await chatwoot.teams.create({ team: values });
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      allow_auto_assign: true,
    },
    validation: {
      name: FormValidation.Required,
      description: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.PlusCircle} title="Create Team" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Team Name" placeholder="Example: Sales, Customer Support" {...itemProps.name} />
      <Form.TextField
        title="Team Description"
        placeholder="Short description about this team."
        {...itemProps.description}
      />
      <Form.Checkbox label="Allow auto assign for this team." {...itemProps.allow_auto_assign} />
    </Form>
  );
}
