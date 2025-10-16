import open from "open";
import { closeMainWindow, showHUD, ActionPanel, Form, Action, showToast, Toast } from "@raycast/api";
import { SipInstallationCheck } from "./checkInstall";

async function hexCheck(nameValue: string, hexValue: string) {
  if (await SipInstallationCheck()) {
    // trim leading and trailing whitespace, remove '#' from string
    const hexColor = hexValue.trim().replace(/^#+/, "");
    const reg = /^#([0-9a-f]{3}){1,2}$/i;

    // check length of hex string
    if (hexColor.length !== 6) {
      const options: Toast.Options = {
        style: Toast.Style.Failure,
        title: "Hex values must be 6 characters",
        message: "example : #c0ff33",
        primaryAction: {
          title: "Try again",
          onAction: (toast) => {
            toast.hide();
          },
        },
      };
      await showToast(options);
    } // check if hex is valid
    else if (reg.test("#" + hexColor) === false) {
      const options: Toast.Options = {
        style: Toast.Style.Failure,
        title: "Hex code is not valid",
        message: "example : #c0ff33",
        primaryAction: {
          title: "Try again",
          onAction: (toast) => {
            toast.hide();
          },
        },
      };
      await showToast(options);
    } else {
      submitColor(nameValue, hexColor);
    }
  }
}

async function submitColor(nameValue: string, hexColor: string) {
  const url = "sip://color/hex/" + nameValue + "/#" + hexColor;
  open(url);
  await closeMainWindow();
  await showHUD("Added to Sip color history 🎨");
}

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Color" onSubmit={(values) => hexCheck(values.name, values.hex)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Color Name" info="Optional" placeholder="Raycast Red" />
      <Form.TextField id="hex" title="Color Hex" info="Hex value must be 6 characters" placeholder="#ff6363" />
    </Form>
  );
}
