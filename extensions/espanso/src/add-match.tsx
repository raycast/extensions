import { Action, ActionPanel, Detail, Form, Toast, popToRoot, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { EspansoMatch } from "./lib/types";
import { appendMatchToFile, formatMatch, getAndSortTargetFiles, getEspansoConfig } from "./lib/utils";

export interface Values {
  trigger: string;
  label?: string;
  replace: string;
  matchFile: string;
}

export default function Command() {
  const [matchFilesDirectory, setMatchFilesDirectory] = useState<string>("null");
  const [sortedMatchFiles, setSortedMatchFiles] = useState<{ file: string; mtime: number }[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { match: matchFilesDirectory } = await getEspansoConfig();

        const sortedMatchFiles: { file: string; mtime: number }[] = getAndSortTargetFiles(matchFilesDirectory);

        setMatchFilesDirectory(matchFilesDirectory);

        setSortedMatchFiles(sortedMatchFiles);
      } catch (err) {
        setError(err instanceof Error ? err : null);
      }
    };
    fetchData();
  }, []);

  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit(values) {
      const { matchFile } = values;

      const espansoMatch: EspansoMatch = {
        triggers: values.trigger
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        label: values.label,
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

  if (error) {
    return <Detail markdown={error.message} />;
  }

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
        title="Label"
        info="A human-readable text of the trigger"
        placeholder="Enter label"
        {...itemProps.label}
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
