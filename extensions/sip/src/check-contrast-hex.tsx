import open from "open";
import { closeMainWindow, showHUD, ActionPanel, Form, Action, showToast, Toast } from "@raycast/api";
import { SipInstallationCheck } from "./checkInstall";

async function hexCheck(value1: string, value2: string) {
  if (await SipInstallationCheck()) {
    // trim leading and trailing whitespace, remove '#' from string
    const fgColor = value1.trim().replace(/^#+/, "");
    const bgColor = value2.trim().replace(/^#+/, "");
    const reg = /^#([0-9a-f]{3}){1,2}$/i;

    // check length of hex string
    if (fgColor.length !== 6 || bgColor.length !== 6) {
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
    else if (reg.test("#" + fgColor) === false || reg.test("#" + bgColor) === false) {
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
      submitColors(fgColor, bgColor);
    }
  }
}

async function submitColors(fgColor: string, bgColor: string) {
  const url = "sip://contrast/hex/#" + bgColor + "," + fgColor;
  open(url);
  await closeMainWindow();
  await showHUD("Checking Contrast in Sip 🎨");
}

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Check Contrast" onSubmit={(values) => hexCheck(values.fg, values.bg)} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="fg"
        title="Foreground Color Hex"
        info="Hex value must be 6 characters"
        placeholder="#f0f2f5"
      />
      <Form.TextField
        id="bg"
        title="Background Color Hex"
        info="Hex value must be 6 characters"
        placeholder="#400547"
      />
    </Form>
  );
}
