import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { fizzy } from "./fizzy";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  environment,
  Form,
  Grid,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import Cards from "./cards";

export default function ManageBoards() {
  const { isLoading, data: boards, mutate } = useCachedPromise(fizzy.boards.list, [], { initialData: [] });

  return (
    <Grid isLoading={isLoading}>
      {boards.map((board) => (
        <Grid.Item
          key={board.id}
          content={{
            source: "board.svg",
            tintColor: environment.appearance === "dark" ? Color.PrimaryText : undefined,
          }}
          title={board.name}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.CreditCard} title="Cards" target={<Cards board={board} />} />
              <Action.OpenInBrowser url={board.url} />
              <Action.Push
                icon={Icon.Plus}
                title="Add Board"
                target={<AddBoard />}
                onPop={mutate}
                shortcut={Keyboard.Shortcut.Common.New}
              />
              <Action
                icon={Icon.Trash}
                title="Delete Board"
                onAction={() =>
                  confirmAlert({
                    icon: { source: Icon.Trash, tintColor: Color.Red },
                    title: "Delete board?",
                    message:
                      "Are you sure you want to permanently delete this board and all the cards on it? This can't be undone.",
                    primaryAction: {
                      style: Alert.ActionStyle.Destructive,
                      title: "Delete",
                      async onAction() {
                        const toast = await showToast(Toast.Style.Animated, "Deleting", board.name);
                        try {
                          await mutate(fizzy.boards.delete(board.id), {
                            optimisticUpdate(data) {
                              return data.filter((b) => b.id !== board.id);
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
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

function AddBoard() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string; auto_postpone_period: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        await fizzy.boards.create({ name: values.name, auto_postpone_period: +values.auto_postpone_period });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      auto_postpone_period: "365",
    },
    validation: {
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Board" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Name it..." {...itemProps.name} />
      <Form.Dropdown
        title="Auto close"
        info="Fizzy doesn't let stale cards stick around forever. Cards automatically move to “Not now” if no one updates, comments, or moves a card for…"
        {...itemProps.auto_postpone_period}
      >
        {[3, 7, 30, 90, 365, 11].map((day) => (
          <Form.Dropdown.Item key={day} title={`${day} days`} value={`${day}`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
