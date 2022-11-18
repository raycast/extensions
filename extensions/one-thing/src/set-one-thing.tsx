import {
  Form,
  Cache,
  ActionPanel,
  Action,
  popToRoot,
  closeMainWindow,
  launchCommand,
  LaunchType,
  Icon,
  getPreferenceValues,
} from "@raycast/api";

const cache = new Cache();

const placeholders = [
  "Eat more healthily",
  "Exercise",
  "Reply to Sarah’s email",
  "Be happy",
  "Stop procrastinating",
  "Finish the 🦄 project",
  "Important meeting today",
];

const placeholder = placeholders[Math.floor(Math.random() * placeholders.length)];

const { shouldCloseMainWindow } = getPreferenceValues<{ shouldCloseMainWindow: boolean }>();

function closeAndUpdate() {
  launchCommand({ name: "show-one-thing", type: LaunchType.Background });
  popToRoot();

  if (shouldCloseMainWindow) {
    closeMainWindow();
  }
}

export default function Command(props: { arguments?: { oneThing: string } }) {
  if (props.arguments?.oneThing) {
    cache.set("onething", props.arguments.oneThing);
    closeAndUpdate();
    return null;
  }

  const oneThing = cache.get("onething");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Pencil}
            title="Set the Thing"
            onSubmit={(values) => {
              cache.set("onething", values.text);
              closeAndUpdate();
            }}
          />
          {oneThing ? (
            <Action
              icon={Icon.Trash}
              title="Remove the Thing"
              onAction={() => {
                cache.remove("onething");
                closeAndUpdate();
              }}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField id="text" placeholder={placeholder} defaultValue={oneThing} title="One Thing" />
    </Form>
  );
}
