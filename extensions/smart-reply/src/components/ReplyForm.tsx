import { Action, ActionPanel, Form, getPreferenceValues, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { Result } from "./Result";
import { TONE_OPTIONS, TRANSLATION_STYLE_OPTIONS } from "../constants";
interface ReplyFormProps {
  translationText: string;
  detectedLanguage: string;
}

const ReplyForm = ({ translationText, detectedLanguage }: ReplyFormProps) => {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ reply: string; tone: string; translationStyle: string }>({
    initialValues: {
      tone: preferences.defaultTone,
      translationStyle: preferences.defaultStyle,
    },
    onSubmit: (values) => {
      push(
        <Result
          translationText={translationText}
          detectedLanguage={detectedLanguage}
          replyText={values.reply}
          tone={values.tone}
          translationStyle={values.translationStyle}
        />,
      );
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Translation" text={translationText} />
      <Form.TextArea title="Reply Text" placeholder="Reply text" {...itemProps.reply} />
      <Form.Dropdown title="Tone Options" {...itemProps.tone}>
        <Form.Dropdown.Item value={TONE_OPTIONS.FORMAL} title="🎩 Formal" />
        <Form.Dropdown.Item value={TONE_OPTIONS.CASUAL} title="😊 Casual" />
      </Form.Dropdown>
      <Form.Dropdown title="Translation Style" {...itemProps.translationStyle}>
        <Form.Dropdown.Item value={TRANSLATION_STYLE_OPTIONS.NATURAL} title="🌿 Natural" />
        <Form.Dropdown.Item value={TRANSLATION_STYLE_OPTIONS.LITERAL} title="📝 Literal" />
        <Form.Dropdown.Item value={TRANSLATION_STYLE_OPTIONS.SIMPLE} title="💫 Simple" />
      </Form.Dropdown>
    </Form>
  );
};

export default ReplyForm;
