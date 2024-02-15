import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  closeMainWindow,
  PopToRootType,
  getPreferenceValues,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

interface IntentionForm {
  task: string;
  mood: string[];
  reason: string;
}

// Assuming there's a preferences setup in the extension's package.json for customMoods
const { customMoods } = getPreferenceValues<{ customMoods: string }>();

export default function IntentionClarifier() {
  const moods = [
    ...new Set(
        customMoods
            .split(",")
            .map((mood) => mood.trim())
            .filter((mood) => mood !== ""),
    ),
  ];

  const { itemProps, setValue, values } = useForm<IntentionForm>({
    async onSubmit(values) {
      console.log("onSubmit", values);
    },
    initialValues: {
      mood: [],
    },
    validation: {
      task: FormValidation.Required,
    },
  });

  return (
      <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Paste Intention" onSubmit={(data: IntentionForm) => handleSubmit(data, "paste")} />
              <Action.SubmitForm title="Copy to Clipboard" onSubmit={(data: IntentionForm) => handleSubmit(data, "copy")} />
            </ActionPanel>
          }
      >
        <Form.TextField title="Task" placeholder="What do you want to do?" {...itemProps.task} />
        <Form.TagPicker
            id="mood"
            title="Mood"
            value={values.mood}
            onChange={(newMood) => setValue("mood", newMood)}
            placeholder="Needed mindsets?"
        >
          {moods.map((mood) => (
              <Form.TagPicker.Item key={mood} value={mood} title={mood} />
          ))}
        </Form.TagPicker>
        <Form.TextField title="Reason" placeholder="Why are you doing it?" {...itemProps.reason} />
      </Form>
  );
}

async function handleSubmit(data: IntentionForm, action: string) {
  const moodText = data.mood.join(", ");
  const intention = `I want to ${data.task}${moodText ? " with a mindset of " + moodText : ""}${data.reason ? " because " + data.reason : ""}: `;

  if (action === "paste") {
    Clipboard.paste(intention).then(() => showToast(Toast.Style.Success, "Intention pasted!"));
  } else if (action === "copy") {
    Clipboard.copy(intention).then(() => showToast(Toast.Style.Success, "Intention copied to clipboard!"));
  }

  await closeMainWindow({ popToRootType: PopToRootType.Immediate });
}