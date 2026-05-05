import { Action, ActionPanel, Form, launchCommand, LaunchType, LocalStorage, showToast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { type Command } from "./lib/commands/types";

interface ImportFormValues {
  json: string;
  overwrite: boolean;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<ImportFormValues>({
    async onSubmit(values) {
      const currentCommands = (await LocalStorage.allItems()) as { string: Command };
      const jsonObj = JSON.parse(values.json) as { [key: string]: Command | string };

      let numNewCommands = 0;
      let numReplacedCommands = 0;

      for (const key of Object.keys(jsonObj)) {
        let jsonValue: Command = jsonObj[key] as unknown as Command;
        if (typeof jsonObj[key] == "string") {
          jsonValue = JSON.parse(jsonObj[key] as unknown as string);
        }
        if (key in currentCommands) {
          let newKey = key;
          if (!values.overwrite) {
            let commandVersion = 2;
            newKey = `${key} ${commandVersion}`;
            while (newKey in currentCommands) {
              commandVersion += 1;
              newKey = `${key} ${commandVersion}`;
            }

            jsonValue["name"] = newKey;
            numNewCommands += 1;
          } else {
            numReplacedCommands += 1;
          }
          await LocalStorage.setItem(newKey, JSON.stringify(jsonValue));
        } else {
          await LocalStorage.setItem(key, JSON.stringify(jsonValue));
          numNewCommands += 1;
        }
      }

      if (numNewCommands > 0 && numReplacedCommands > 0) {
        showToast({
          title: `Added ${numNewCommands} command${numNewCommands == 1 ? "" : "s"}, replaced ${numReplacedCommands}`,
        });
      } else if (numNewCommands > 0) {
        showToast({ title: `Added ${numNewCommands} PromptLab command${numNewCommands == 1 ? "" : "s"}` });
      } else if (numReplacedCommands > 0) {
        showToast({ title: `Replaced ${numReplacedCommands} PromptLab command${numReplacedCommands == 1 ? "" : "s"}` });
      } else {
        showToast({ title: `No PromptLab commands added or replaced` });
      }

      launchCommand({ name: "search-commands", type: LaunchType.UserInitiated });
    },
    initialValues: {
      overwrite: true,
    },
    validation: {
      json: (value) => {
        if (!value) {
          return "Must not be empty";
        }

        try {
          const jsonObj = JSON.parse(value);
          let index = 1;
          for (const [key, value] of Object.entries(jsonObj)) {
            let commandData = {} as Command;

            try {
              /* Assume value is a data string, as is default for export via Search PromptLab Commands interface. */
              commandData = JSON.parse(value as string) as Command;
            } catch {
              /* Fallback to using the value as raw JSON. */
              commandData = value as Command;
            }

            if (commandData["name"] == undefined || commandData["name"].length == 0) {
              return `Missing name argument for command #${index} with key ${key}`;
            }

            if (commandData["prompt"] == undefined || commandData["prompt"].length == 0) {
              return `Missing prompt argument for command #${index} with key ${key}`;
            }

            const intValue = parseInt(commandData["minNumFiles"] as unknown as string);
            if (intValue == undefined || intValue < 0) {
              return `Invalid minimum file count argument for command #${index} with key ${key}`;
            }
            index = index + 1;
          }
        } catch (error) {
          console.log(error);
          return "Invalid JSON string";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Commands" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Commands JSON" placeholder="JSON string of one or more commands" {...itemProps.json} />

      <Form.Checkbox
        label="Overwrite?"
        info="If checked, existing commands will be overwritten with the newly imported ones. Otherwise, newly imported commands with duplicate titles will have a '2' appended at the end."
        {...itemProps.overwrite}
      />
    </Form>
  );
}
