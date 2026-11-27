import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

export default function RefineForm(props: {
  command: string;
  onRefine: (change: string) => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Refine Command"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Refine Command"
            onSubmit={({ change }: { change: string }) => {
              if (!change.trim()) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Describe the change",
                });
                return false;
              }
              pop();
              props.onRefine(change.trim());
              return true;
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Command" text={props.command} />
      <Form.TextField
        id="change"
        title="How should it change?"
        placeholder="e.g. only files over 100 MB, keep the originals"
        autoFocus
      />
    </Form>
  );
}
