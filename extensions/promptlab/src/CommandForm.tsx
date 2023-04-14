import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Icon,
  LocalStorage,
  useNavigation,
  Color,
  environment,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { Command } from "./utils/types";

interface CommandFormValues {
  name: string;
  prompt: string;
  icon: string;
  iconColor?: string;
  minNumFiles: string;
  acceptedFileExtensions?: string;
  useMetadata?: boolean;
  useAudioDetails?: boolean;
  useSoundClassification?: boolean;
  useSubjectClassification?: boolean;
  useRectangleDetection?: boolean;
  useBarcodeDetection?: boolean;
  useFaceDetection?: boolean;
  outputKind?: string;
  actionScript?: string;
  showResponse?: boolean;
}

export default function CommandForm(props: {
  oldData?: CommandFormValues;
  setCommands?: React.Dispatch<React.SetStateAction<Command[] | undefined>>;
}) {
  const { oldData, setCommands } = props;
  const { pop } = useNavigation();

  let maxPromptLength = oldData?.minNumFiles == "0" ? 3000 : 500;

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
      iconColor: Color.PrimaryText,
      minNumFiles: "0",
      useMetadata: false,
      acceptedFileExtensions: "",
      useAudioDetails: false,
      useSoundClassification: true,
      useSubjectClassification: true,
      useRectangleDetection: true,
      useBarcodeDetection: true,
      useFaceDetection: true,
      outputKind: "detail",
      actionScript: "",
      showResponse: true,
    },
    validation: {
      name: FormValidation.Required,
      prompt: (value) => {
        if (!value) {
          return "Must provide a prompt";
        }

        if (value.length > maxPromptLength) {
          return `Prompt must be ${maxPromptLength} characters or fewer`;
        }
      },
      minNumFiles: (value) => {
        if (!value) {
          return "Must specify minimum number of files";
        }

        const num = parseInt(value);
        if (num == undefined || num < 0) {
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

      <Form.Dropdown title="Icon Color" {...itemProps.iconColor}>
        <Form.Dropdown.Item
          title={environment.theme == "dark" ? "White" : "Black"}
          value={Color.PrimaryText}
          icon={{ source: Icon.CircleFilled, tintColor: Color.PrimaryText }}
        />
        <Form.Dropdown.Item title="Red" value={Color.Red} icon={{ source: Icon.CircleFilled, tintColor: Color.Red }} />
        <Form.Dropdown.Item
          title="Orange"
          value={Color.Orange}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Orange }}
        />
        <Form.Dropdown.Item
          title="Yellow"
          value={Color.Yellow}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Yellow }}
        />
        <Form.Dropdown.Item
          title="Green"
          value={Color.Green}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Green }}
        />
        <Form.Dropdown.Item
          title="Blue"
          value={Color.Blue}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Blue }}
        />
        <Form.Dropdown.Item
          title="Purple"
          value={Color.Purple}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Purple }}
        />
        <Form.Dropdown.Item
          title="Magenta"
          value={Color.Magenta}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Magenta }}
        />
      </Form.Dropdown>

      <Form.TextArea title="Prompt" placeholder="Instructions for Raycast AI to follow" {...itemProps.prompt} />

      <Form.TextArea
        title="Script"
        placeholder="AppleScript code to run after response"
        info="An AppleScript script to run after receiving a response to the prompt. Use the `response` variable to access the text of the response."
        {...itemProps.actionScript}
      />

      <Form.Checkbox
        label="Show Response View"
        {...itemProps.showResponse}
        info="If checked, the AI's output will be display in Raycast. Disabling this is only useful if you provide an action script."
      />

      <Form.TextField
        title="Minimum File Count"
        placeholder="Minimum number of files required"
        onChange={(value) => {
          const intVal = parseInt(value);
          if (intVal == 0) {
            maxPromptLength = 3000;
          }
        }}
        {...itemProps.minNumFiles}
      />

      <Form.Dropdown
        title="Output View"
        info="The view in which the command's output will be rendered. Detail is the most likely to work for any given command, but File AI will do its best to give you usable output no matter what."
        {...itemProps.outputKind}
      >
        <Form.Dropdown.Item title="Detail" value="detail" icon={Icon.AppWindow} />
        <Form.Dropdown.Item title="List" value="list" icon={Icon.List} />
      </Form.Dropdown>

      <Form.TextArea
        title="Accepted File Extensions"
        placeholder="Comma-separated list of file extensions, e.g. txt, csv, html"
        {...itemProps.acceptedFileExtensions}
      />

      <Form.Checkbox
        title="Included Information"
        label="Use File Metadata"
        {...itemProps.useMetadata}
        info="If checked, metadata of selected files will be included in the text provided to the AI, and additional EXIF data will be included for image files."
      />

      <Form.Checkbox
        label="Use Subject Classifications"
        {...itemProps.useSubjectClassification}
        info="If checked, subject classification labels will be included in the text provided to the AI when acting on image files."
      />

      <Form.Checkbox
        label="Use Sound Classifications"
        {...itemProps.useSoundClassification}
        info="If checked, sound classification labels will be included in the text provided to the AI when acting on audio files."
      />

      <Form.Checkbox
        label="Use Transcribed Audio"
        {...itemProps.useAudioDetails}
        info="If checked, transcribed text will be provided to the AI when acting on audio files."
      />

      <Form.Checkbox
        label="Use Barcode Detection"
        {...itemProps.useBarcodeDetection}
        info="If checked, the payload text of any barcodes and QR codes in images will be included in the text provided to the AI."
      />

      <Form.Checkbox
        label="Use Rectangle Detection"
        {...itemProps.useRectangleDetection}
        info="If checked, the size and position of rectangles in image files with be included in the text provided to the AI."
      />

      <Form.Checkbox
        label="Use Face Detection"
        {...itemProps.useFaceDetection}
        info="If checked, the number of faces in image files will be included in the text provided to the AI."
      />
    </Form>
  );
}
