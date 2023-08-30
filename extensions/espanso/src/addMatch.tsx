import { Action, ActionPanel, Form, Toast, popToRoot, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { homedir } from "os";
import { join } from "path";
import { appendMatchToFile, formatMatch, getAndSortTargetFiles } from "./utils";
import { EspansoMatch } from "./types";

const matchFilesDirectory: string = join(homedir(), "Library/Application Support/espanso/match");
const sortedMatchFiles: { file: string; mtime: number }[] = getAndSortTargetFiles(matchFilesDirectory);
export interface Values {
  trigger: string;
  replace: string;
  matchFile: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit(values) {
      const { matchFile } = values;
      const espansoMatch: EspansoMatch = {
        triggers: values.trigger
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        replace: values.replace,
      };
      appendMatchToFile(formatMatch(espansoMatch), matchFile, matchFilesDirectory);
      popToRoot();
      showToast({
        style: Toast.Style.Success,
        title: "Success!",
        message: `Match added to ${matchFile}`,
      });
    },
    validation: {
      trigger: FormValidation.Required,
      replace: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Trigger(s)"
        info="A trigger or comma separated a list of triggers to add to espanso"
        placeholder="Enter trigger"
        {...itemProps.trigger}
      />
      <Form.TextField
        title="Replace"
        placeholder="Enter replacement"
        info="The replacement text"
        {...itemProps.replace}
      />
      <Form.Dropdown title="Match File" {...itemProps.matchFile}>
        {sortedMatchFiles.map((matchFile) => (
          <Form.Dropdown.Item key={matchFile.file} value={matchFile.file} title={matchFile.file} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
