import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactNode } from "react";
import { selectedFinderFiles } from "../lib/files";

type Props = {
  /** Submit button title, e.g. "Transcribe". */
  actionTitle: string;
  allowMultiple?: boolean;
  /** Renders the view for the chosen files. */
  children: (paths: string[]) => ReactNode;
};

function PickFilesForm({ actionTitle, allowMultiple = true, children }: Props) {
  const { push } = useNavigation();

  async function handleSubmit(values: { files: string[] }) {
    if (values.files.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Pick an audio or video file" });
      return;
    }
    push(<>{children(values.files)}</>);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={actionTitle} icon={Icon.Microphone} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Select audio or video files in Finder before opening this command to skip this step." />
      <Form.FilePicker
        id="files"
        title="Audio or Video"
        allowMultipleSelection={allowMultiple}
        canChooseDirectories={false}
      />
    </Form>
  );
}

/** Uses the Finder selection when there is one, otherwise asks for files. */
export function FileSource(props: Props) {
  const { data: selection, isLoading } = usePromise(selectedFinderFiles);

  if (isLoading || !selection) return <List isLoading />;
  if (selection.length > 0) {
    const paths = props.allowMultiple === false ? selection.slice(0, 1) : selection;
    return <>{props.children(paths)}</>;
  }
  return <PickFilesForm {...props} />;
}
