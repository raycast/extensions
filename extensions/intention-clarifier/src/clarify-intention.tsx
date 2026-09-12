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
  Icon,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

interface IntentionForm {
  task: string;
  mood: string[];
  reason: string;
  mode?: string;
}

// Assuming there's a preferences setup in the extension's package.json for customMoods
const { customMoods, defaultAction } = getPreferenceValues<Preferences.ClarifyIntention>();

export default function IntentionClarifier() {
  const moods = [
    ...new Set(
      customMoods
        .split(",")
        .map((mood) => mood.trim())
        .filter((mood) => mood !== ""),
    ),
  ];

  const { handleSubmit, itemProps, setValue, values } = useForm<IntentionForm>({
    async onSubmit(values) {
      const moodText = values.mood.join(", ");
      const intention = `I want to ${values.task}${moodText ? " with a mindset of " + moodText : ""}${values.reason ? " because " + values.reason : ""}: `;

      if (values.mode === "paste") {
        Clipboard.paste(intention).then(() => showToast(Toast.Style.Success, "Intention pasted!"));
      } else if (values.mode === "copy") {
        Clipboard.copy(intention).then(() => showToast(Toast.Style.Success, "Intention copied to clipboard!"));
      }

      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    },
    initialValues: {
      mood: [],
    },
    validation: {
      task: FormValidation.Required,
    },
  });

  const copyAction = (
    <Action.SubmitForm
      title="Copy"
      icon={Icon.CopyClipboard}
      onSubmit={() => {
        values.mode = "copy";
        handleSubmit(values);
      }}
    />
  );

  const pasteAction = (
    <Action.SubmitForm
      title="Paste"
      icon={Icon.Clipboard}
      onSubmit={() => {
        values.mode = "paste";
        handleSubmit(values);
      }}
    />
  );

  return (
    <Form
      actions={
        <ActionPanel>
          {defaultAction === "copy" ? copyAction : pasteAction}
          {defaultAction === "copy" ? pasteAction : copyAction}
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
