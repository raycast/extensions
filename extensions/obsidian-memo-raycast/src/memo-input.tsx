import {
  Form,
  ActionPanel,
  Action,
  popToRoot,
  useNavigation,
} from "@raycast/api";
import { useMemoSubmit } from "./hooks/useMemoSubmit";
import { TEXTS } from "./constants/texts";
import Settings from "./settings";

interface MemoForm {
  memo: string;
}

export default function MemoInput(): JSX.Element {
  const { isLoading, submitMemo } = useMemoSubmit();
  const { push } = useNavigation();

  const handleSubmit = async (values: MemoForm): Promise<void> => {
    await submitMemo(values.memo);
  };

  const openSettings = () => {
    push(<Settings />);
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={TEXTS.actions.submit}
            icon="📝"
            onSubmit={handleSubmit}
          />
          <Action
            title={TEXTS.settings.title}
            icon="⚙️"
            shortcut={{ modifiers: ["cmd"], key: "," }}
            onAction={openSettings}
          />
          <Action
            title={TEXTS.actions.cancel}
            icon="❌"
            shortcut={{ modifiers: ["cmd"], key: "escape" }}
            onAction={popToRoot}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="memo"
        title={TEXTS.title}
        placeholder={TEXTS.placeholder}
        autoFocus
      />
      <Form.Description text={TEXTS.description} />
    </Form>
  );
}
