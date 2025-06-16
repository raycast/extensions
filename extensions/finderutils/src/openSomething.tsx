import { Toast, showToast, LaunchProps } from "@raycast/api";
import { runAppleScript } from "./utils";

export default async (props: LaunchProps<{ arguments: { thing: string; application: string } }>) => {
  const thing: string = props.arguments.thing;
  const application: string = props.arguments.application;

  let script = `
        set command to "open " & "${thing}"
        try
          do shell script command
        on error err
          return err
        end try
    `;

  if (application) {
    script = `
            set command to "open -a " & "${application} " & "${thing}"
            try
              do shell script command
            on error err
              return err
            end try
        `;
  }

  try {
    const result = (await runAppleScript(script)).trim();
    if (result.includes("application")) {
      await showToast(Toast.Style.Failure, "Error opening file:", "Application not found");
    } else if (result.includes("file")) {
      await showToast(Toast.Style.Failure, "Error opening file:", "File not found");
    } else {
      await showToast(Toast.Style.Success, "Done", result);
    }
  } catch {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
