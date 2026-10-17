import { Action, ActionPanel, Icon, useNavigation } from "@raycast/api";
import { QuestionFormProps } from "../type";
import { QuestionForm } from "../views/question/form";

export const FormInputActionSection = (props: QuestionFormProps) => {
  const { push } = useNavigation();

  return (
    <ActionPanel.Section title="Input">
      <Action
        title="Full Text Input"
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        icon={Icon.Text}
        onAction={() => {
          push(<QuestionForm {...props} />);
        }}
      />
    </ActionPanel.Section>
  );
};
