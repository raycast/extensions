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

      const input = values["input"].split(" "); // seperate strings into the parts
      const instruction = values["instruction"];

      let timer = 0;

      let err = "";
      // try catch for input validation and parsing

      const numbers = input.filter((string) => {
        return !isNaN(Number(string));
      });

      const units = input.map((string) => {
        if (/\d/.test(string)) {
          const match = string.match(/\d+/);
          if (match) {
            numbers.push(match[0]);
            console.log(string.replace(/\d+/, ""));
          }
        }
        return string.replace(/\d+/, "");
      });
      if (numbers.length <= 0) {
        err = "Missing Time";
      }

      console.log(numbers, units);
      numbers.forEach(async (value, index) => {
        const number = Number(value);
        if (units[index]) {
          if (units[index].toLowerCase().startsWith("s")) {
            timer += number; // seconds
          } else if (units[index].toLowerCase().startsWith("m")) {
            timer += number * 60; // minutes -> seconds
          } else if (units[index].toLowerCase().startsWith("h")) {
            timer += number * 60 * 60; // hours -> seconds
          } else {
            err = "Timer is missing units";
          }
        } else {
          timer += number * 60; // defaults to minutes
        }
      });

      if (timer > 15 * 60 * 60) {
        // greater than 15 hours
        err = "Timer greater than 15 hours";
      }
      /* 
            the apple script uses seconds for the delay
            the instruction needs to be sanitized first
      */

      if (!allowedInstructions.includes(instruction)) {
        err = "Invalid instruction";
      }

      if (err) {
        await showFailureToast(err);
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
      <Form.TextField title="Set Time Here" {...itemProps.input} placeholder="<h/hours> <m/minutes> <s/seconds>" />
      <Form.Description text={`If you only want one unit, just use on their own. The maximum time is 15 hours`} />
      <Form.Dropdown title="Instruction" {...itemProps.instruction}>
        <Form.Dropdown.Item value="shut down" title="Shut down PC" />
        <Form.Dropdown.Item value="restart" title="Restart PC" />
        <Form.Dropdown.Item value="sleep" title="Sleep PC" />
      </Form.Dropdown>
    </Form>
  );
}
