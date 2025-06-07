import { Action, ActionPanel, Form, LocalStorage, showHUD } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { ChildProcess, exec } from "child_process";

interface CommandFormValues {
  input: string;
  instruction: string;
}

const allowedInstructions = ["shut down", "restart", "sleep"];

export default function Command() {
  const { handleSubmit, itemProps } = useForm<CommandFormValues>({
    async onSubmit(values) {
      const pid = await LocalStorage.getItem<number>("pid");

      if (pid) {
        try {
          process.kill(pid);
        } catch (err) {
          console.error(err);
        }
      }
      await LocalStorage.removeItem("timerEnd");
      await LocalStorage.removeItem("pid");

      //   await closeMainWindow({ clearRootSearch: true });

      const input = values["input"].split(" "); // seperate strings into the parts
      const instruction = values["instruction"];

      const numbers = input.filter((string) => {
        return !isNaN(Number(string));
      });

      if (numbers.length <= 0) {
        await showFailureToast("Missing Time");
        return;
      }

      const units = input.filter((string) => {
        return isNaN(Number(string));
      });

      let timer = 0;

      numbers.forEach((value, index) => {
        const number = Number(value);
        if (units[index]) {
          if (units[index].startsWith("sec")) {
            timer += number; // seconds
          }
          if (units[index].startsWith("min")) {
            timer += number * 60; // minutes -> seconds
          }
        } else {
          timer += number * 60; // defaults to minutes
        }
      });

      if (timer >= 120 * 60) {
        // greater than two hours
        await showFailureToast("Timer greater than 2 hours");
        return;
      }
      /* 
            the apple script uses seconds for the delay
            the instruction needs to be sanitized first
      */

      if (!allowedInstructions.includes(instruction)) {
        await showFailureToast("Invalid instruction");
        return;
      }

      const command = `
            osascript -e 'on run argv
                delay (item 1 of argv)
                tell application "Finder"
                    ${instruction}
                end tell
            end run' ${timer}
        `;

      // checks to see if the process is created
      let processRef: ChildProcess;
      try {
        processRef = exec(command); // runs script in background
      } catch (err) {
        console.error(err);
        await showFailureToast(err, { title: "Failed to start shutdown timer" });
        return;
      }

      /* 
            Right now the command works and it delays for the time period specified
            The processRef is used to get the PID of the background task so that we can kill it if we need to
        */

      await LocalStorage.setItem("timerEnd", Date.now() + Number(timer) * 1000); // using millisecond
      if (processRef.pid) await LocalStorage.setItem("pid", processRef.pid); // store pid in LocalStorage

      await showHUD("Started Shutdown Sequence");
    },
    initialValues: {
      instruction: "shut down",
    },
    validation: {
      input: FormValidation.Required,
      instruction: (value) => {
        if (value && !allowedInstructions.includes(value)) {
          return "The instruction selected is invalid";
        } else if (!value) {
          return "The item is required";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Schedule Timer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Set Time Here" {...itemProps.input} />
      <Form.Description
        text={`You can write it as "<minute> min/minutes <second> sec/seconds". If you only want one unit, just use minutes or seconds on their own.`}
      />
      <Form.Dropdown title="Instruction" {...itemProps.instruction}>
        <Form.Dropdown.Item value="shut down" title="Shut down PC" />
        <Form.Dropdown.Item value="restart" title="Restart PC" />
        <Form.Dropdown.Item value="sleep" title="Sleep PC" />
      </Form.Dropdown>
    </Form>
  );
}
