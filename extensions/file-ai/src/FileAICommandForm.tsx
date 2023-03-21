import { Action, ActionPanel, Form, showToast, Icon, LocalStorage, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { Command } from "./types";

interface CommandFormValues {
  name: string;
  prompt: string;
  icon: string;
  minNumFiles: string;
  acceptedFileExtensions: string;
  useFileMetadata: boolean;
  useSoundClassifications: boolean;
}

export default function FileAICommandForm(props: {
  oldData?: CommandFormValues;
  setCommands?: React.Dispatch<React.SetStateAction<Command[] | undefined>>;
}) {
  const { oldData, setCommands } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CommandFormValues>({
    async onSubmit(values) {
      await LocalStorage.setItem(values.name, JSON.stringify(values));
      if (oldData && oldData.name != values.name) {
        await LocalStorage.removeItem(oldData.name);
      }

      if (setCommands) {
        const commandData = await LocalStorage.allItems();
        const commandDataFiltered = Object.values(commandData).filter(
          (cmd, index) =>
            Object.keys(commandData)[index] != "--defaults-installed" || (oldData && oldData.name == cmd.name)
        );
        setCommands(commandDataFiltered.map((data) => JSON.parse(data)));
      }
      await showToast({ title: "Added File AI Command" });
      pop();
    },
    initialValues: oldData || {
      minNumFiles: "1",
      useFileMetadata: false,
      useSoundClassifications: false,
    },
    validation: {
      name: FormValidation.Required,
      prompt: FormValidation.Required,
      minNumFiles: (value) => {
        if (!value) {
          return "Must specify minimum number of files";
        }

        const num = parseInt(value);
        if (!num) {
          return "Invalid number";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Command" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Command Name" placeholder="Name of File AI Command" {...itemProps.name} />

      <Form.TextArea title="Prompt" placeholder="Instructions for Raycast AI to follow" {...itemProps.prompt} />

      <Form.Dropdown title="Icon" {...itemProps.icon}>
        {Object.keys(Icon).map((iconName, index) => (
          <Form.Dropdown.Item
            title={iconName}
            value={Object.values(Icon)[index]}
            key={iconName}
            icon={Object.values(Icon)[index]}
          />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        title="Minimum File Count"
        placeholder="Minimum number of files required"
        {...itemProps.minNumFiles}
      />

      <Form.TextArea
        title="Accepted File Extensions"
        placeholder="Comma-separated list of file extensions, e.g. txt, csv, html"
        {...itemProps.acceptedFileExtensions}
      />

      <Form.Checkbox
        label="General Metadata"
        {...itemProps.useFileMetadata}
        info="If checked, metadata of selected files will be included in the text provided to the AI, and additional EXIF data will be included for image files."
      />

      <Form.Checkbox
        label="Sound Classifications"
        {...itemProps.useSoundClassifications}
        info="If checked, sound classification labels will be included in the text provided to the AI when acting on audio files."
      />
    </Form>
  );
}
