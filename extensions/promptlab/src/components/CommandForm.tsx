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
  getPreferenceValues,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { Command, ExtensionPreferences } from "../utils/types";
import { useState } from "react";

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
  description?: string;
  useSaliencyAnalysis?: boolean;
  author?: string;
  website?: string;
  version?: string;
  requirements?: string;
  scriptKind?: string;
  categories?: string[];
  temperature?: string;
}

export default function CommandForm(props: {
  oldData?: Command;
  setCommands?: React.Dispatch<React.SetStateAction<Command[] | undefined>>;
  duplicate?: boolean;
}) {
  const { oldData, setCommands, duplicate } = props;
  const [showResponse, setShowResponse] = useState<boolean>(
    oldData != undefined && oldData.showResponse != undefined ? oldData.showResponse : true
  );
  const { pop } = useNavigation();

  let maxPromptLength = oldData?.minNumFiles == "0" ? 3000 : 500;
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const { handleSubmit, itemProps } = useForm<CommandFormValues>({
    async onSubmit(values) {
      if (!values.showResponse) {
        values["outputKind"] = "none";
      }

      await LocalStorage.setItem(values.name, JSON.stringify(values));
      if (oldData && oldData.name != values.name) {
        await LocalStorage.removeItem(oldData.name);
      }

      if (setCommands) {
        const commandData = await LocalStorage.allItems();
        const commandDataFiltered = Object.values(commandData).filter(
          (cmd, index) =>
            Object.keys(commandData)[index] != "--defaults-installed" &&
            !Object.keys(commandData)[index].startsWith("id-")
        );
        setCommands(commandDataFiltered.map((data) => JSON.parse(data)));
      }

      if (oldData && !duplicate) {
        await showToast({ title: "Command Saved" });
      } else {
        await showToast({ title: "Added PromptLab Command" });
      }
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
      useRectangleDetection: false,
      useBarcodeDetection: true,
      useFaceDetection: false,
      outputKind: "detail",
      actionScript: "",
      showResponse: true,
      description: "",
      useSaliencyAnalysis: true,
      author: "",
      website: "",
      version: "1.0.0",
      requirements: "",
      scriptKind: "applescript",
      categories: ["Other"],
      temperature: "1.0",
    },
    validation: {
      name: FormValidation.Required,
      prompt: (value) => {
        if (!value) {
          return "Must provide a prompt";
        }

        const subbedValue = value.replaceAll(/{{.*?}}/g, "");
        if (subbedValue.length > maxPromptLength) {
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
          <Action.SubmitForm
            title={oldData && !duplicate ? "Save Command" : "Create Command"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Name & Icon" text="Give your command a memorable name and an icon to match." />

      <Form.TextField title="Command Name" placeholder="Name of PromptLab Command" {...itemProps.name} />

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

      <Form.Separator />

      <Form.Description
        title="Instructions"
        text="Learn about placeholders to use in your prompts at promptlab.skaplan.io."
      />

      <Form.TextArea title="Prompt" placeholder="Instructions for AI to follow" {...itemProps.prompt} />

      <Form.TextArea
        title="Script"
        placeholder="Script to run after response is received"
        info="Code for the script to run after receiving a response to the prompt. Use the `response` variable to access the text of the response."
        {...itemProps.actionScript}
      />

      <Form.Dropdown title="Script Kind" info="The type of script used in the Script field." {...itemProps.scriptKind}>
        <Form.Dropdown.Item title="AppleScript" value="applescript" icon={Icon.Paragraph} />
        <Form.Dropdown.Item title="Shell (ZSH)" value="zsh" icon={Icon.Terminal} />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description title="Settings" text="Customize the way your command works and what data is accesses." />

      {showResponse ? (
        <Form.Dropdown
          title="Output View"
          info="The view in which the command's output will be rendered. Detail is the most likely to work for any given command, but PromptLab will do its best to give you usable output no matter what."
          {...itemProps.outputKind}
        >
          <Form.Dropdown.Item title="Detail" value="detail" icon={Icon.AppWindow} />
          <Form.Dropdown.Item title="List" value="list" icon={Icon.List} />
          <Form.Dropdown.Item title="Grid" value="grid" icon={Icon.Message} />
          <Form.Dropdown.Item title="Chat" value="chat" icon={Icon.Message} />
        </Form.Dropdown>
      ) : null}

      <Form.Checkbox
        label="Show Response View"
        {...itemProps.showResponse}
        value={showResponse}
        onChange={setShowResponse}
        info="If checked, the AI's output will be displayed in Raycast. Disabling this is only useful if you provide an action script."
      />

      <Form.TextField
        title="Minimum File Count"
        placeholder="Minimum number of files required"
        info="The minimum number of files that must be selected for the command to be run."
        onChange={(value) => {
          const intVal = parseInt(value);
          if (intVal == 0) {
            maxPromptLength = 3000;
          }
        }}
        {...itemProps.minNumFiles}
      />

      <Form.TextArea
        title="Accepted File Extensions"
        placeholder="Comma-separated list of file extensions, e.g. txt, csv, html"
        info="A list of file extensions that will be accepted by the command. If left blank, all files will be accepted."
        {...itemProps.acceptedFileExtensions}
      />

      {preferences.includeTemperature ? (
        <Form.TextField
          title="Creativity"
          placeholder="Value between 0.0 and 2.0"
          info="A measure of the level of the randomness and creativity in the model's output. Higher values will result in more creative output, but may be less relevant to the prompt. Value must be between 0.0 and 2.0."
          {...itemProps.temperature}
        />
      ) : null}

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

      <Form.Checkbox
        label="Use Saliency Analysis"
        {...itemProps.useSaliencyAnalysis}
        info="If checked, the areas of an image most likely to draw attention will be included in the text provided to the AI."
      />

      <Form.Separator />

      <Form.Description
        title="Command Metadata"
        text="Information about the command for when you share it or upload it to the command store."
      />
      <Form.TextField
        title="Author"
        placeholder="Your name or username"
        info="An optional name or username that others can attribute the command to. If you upload the command to the store, this will be displayed on the command's page."
        {...itemProps.author}
      />
      <Form.TextField
        title="Website"
        placeholder="Your website"
        info="An optional website URL that others can visit to learn more about the command. If you upload the command to the store, this will be displayed on the command's page."
        {...itemProps.website}
      />
      <Form.TextField
        title="Command Version"
        placeholder="The version of the command"
        info="An optional version number for the command. If you upload the command to the store, this will be displayed on the command's page."
        {...itemProps.version}
      />
      <Form.TextArea
        title="Description"
        placeholder="Description of what this command does"
        info="A description of what this command does. Useful if you plan to share the command with others."
        {...itemProps.description}
      />
      <Form.TextArea
        title="Requirements"
        placeholder="Any requirements for the command"
        info="A list or paragraph explaining any requirements for this script, e.g. other commands, command-line utilities, etc."
        {...itemProps.requirements}
      />
      <Form.TagPicker
        title="Categories"
        info="A comma-separated list of categories for the command. This will be used to help users find your command in the store and in their prompt library."
        {...itemProps.categories}
      >
        <Form.TagPicker.Item
          title="Other"
          value="Other"
          icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
        />
        <Form.TagPicker.Item title="Data" value="Data" icon={{ source: Icon.List, tintColor: Color.Blue }} />
        <Form.TagPicker.Item
          title="Development"
          value="Development"
          icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
        />
        <Form.TagPicker.Item title="News" value="News" icon={{ source: Icon.Important, tintColor: Color.Blue }} />
        <Form.TagPicker.Item title="Social" value="Social" icon={{ source: Icon.TwoPeople, tintColor: Color.Green }} />
        <Form.TagPicker.Item title="Web" value="Web" icon={{ source: Icon.Network, tintColor: Color.Red }} />
        <Form.TagPicker.Item title="Finance" value="Finance" icon={{ source: Icon.Coins, tintColor: Color.Blue }} />
        <Form.TagPicker.Item title="Health" value="Health" icon={{ source: Icon.Heartbeat, tintColor: Color.Red }} />
        <Form.TagPicker.Item
          title="Sports"
          value="Sports"
          icon={{ source: Icon.SoccerBall, tintColor: Color.PrimaryText }}
        />
        <Form.TagPicker.Item title="Travel" value="Travel" icon={{ source: Icon.Airplane, tintColor: Color.Yellow }} />
        <Form.TagPicker.Item title="Shopping" value="Shopping" icon={{ source: Icon.Cart, tintColor: Color.Purple }} />
        <Form.TagPicker.Item
          title="Entertainment"
          value="Entertainment"
          icon={{ source: Icon.Video, tintColor: Color.Red }}
        />
        <Form.TagPicker.Item
          title="Lifestyle"
          value="Lifestyle"
          icon={{ source: Icon.Person, tintColor: Color.Green }}
        />
        <Form.TagPicker.Item
          title="Education"
          value="Education"
          icon={{ source: Icon.Bookmark, tintColor: Color.Orange }}
        />
        <Form.TagPicker.Item title="Reference" value="Reference" icon={{ source: Icon.Book, tintColor: Color.Red }} />
        <Form.TagPicker.Item title="Weather" value="Weather" icon={{ source: Icon.CloudSun, tintColor: Color.Blue }} />
        <Form.TagPicker.Item title="Media" value="Media" icon={{ source: Icon.Image, tintColor: Color.Magenta }} />
        <Form.TagPicker.Item title="Calendar" value="Calendar" icon={{ source: Icon.Calendar, tintColor: Color.Red }} />
        <Form.TagPicker.Item
          title="Utilities"
          value="Utilities"
          icon={{ source: Icon.Calculator, tintColor: Color.Green }}
        />
      </Form.TagPicker>
    </Form>
  );
}
