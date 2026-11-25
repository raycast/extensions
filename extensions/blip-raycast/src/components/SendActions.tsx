import { Action, Icon, useNavigation } from "@raycast/api";
import { RecipientList } from "./RecipientList";
import { FilesForm, TextForm } from "./SendForms";

interface Props {
  /** Passed on to the recipient list, for the first Quick Send. */
  rememberForQuickSend?: boolean;
  initialText?: string;
}

/** Opens a text form, then the recipient list for that text. */
export function TypeTextAction({ rememberForQuickSend, initialText }: Props) {
  const { push } = useNavigation();
  return (
    <Action.Push
      title="Type Text…"
      icon={Icon.Text}
      target={
        <TextForm
          navigationTitle="Type Text"
          submitTitle="Choose Recipient"
          initialText={initialText}
          onSubmit={(text) =>
            push(
              <RecipientList
                content={{ kind: "text", text, source: "Typed" }}
                rememberForQuickSend={rememberForQuickSend}
                isNested
              />,
            )
          }
        />
      }
    />
  );
}

/** Opens a file picker, then the recipient list for the chosen files. */
export function ChooseFilesAction({ rememberForQuickSend }: Props) {
  const { push } = useNavigation();
  return (
    <Action.Push
      title="Choose Files…"
      icon={Icon.Folder}
      target={
        <FilesForm
          onSubmit={(paths) =>
            push(
              <RecipientList
                content={{ kind: "files", paths, source: "Chosen files" }}
                rememberForQuickSend={rememberForQuickSend}
                isNested
              />,
            )
          }
        />
      }
    />
  );
}
