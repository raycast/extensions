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
  LaunchProps,
  Keyboard,
  showToast,
  Toast,
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

function closeAndUpdate() {
  launchCommand({ name: "show-one-thing", type: LaunchType.Background });
  popToRoot();
  closeMainWindow();
}

export async function removeTheThing() {
  cache.remove("onething");
  closeAndUpdate();
  await showToast({ title: "Removed One Thing", style: Toast.Style.Success });
}

export async function setTheThing(text: string) {
  cache.set("onething", text);
  closeAndUpdate();
  await showToast({ title: "Set One Thing", style: Toast.Style.Success });
}

export default function Command(
  props: LaunchProps<{ arguments?: Arguments.SetOneThing; launchContext: { oneThing: string } }>
) {
  const oneThingFromLaunchProps = props.arguments?.oneThing ?? props.launchContext?.oneThing;
  if (oneThingFromLaunchProps) {
    return setTheThing(oneThingFromLaunchProps);
  }

  const oneThing = cache.get("onething");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Pencil} title="Set the Thing" onSubmit={(values) => setTheThing(values.text)} />
          {oneThing ? (
            <Action
              style={Action.Style.Destructive}
              icon={Icon.Trash}
              title="Remove the Thing"
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={removeTheThing}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField id="text" placeholder={placeholder} title="One Thing" />
    </Form>
  );
}
