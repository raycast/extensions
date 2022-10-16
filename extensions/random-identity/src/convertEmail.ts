import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  duckToken: string;
  defaultDuckEmail: string;
}
interface Arguments {
  otherEmail: string;
  doesNeedNewEmail: string;
}

function isDuckEmail(_email: string | undefined) {
  if (_email !== "undefied" && _email?.endsWith("@duck.com")) {
    return true;
  } else {
    return false;
  }
}

export default async function main(props: { arguments?: Arguments }) {
  const arg = props.arguments;
  let otherEmailSplitted: string[] | undefined;
  let sourceEmail: string | undefined;
  if (arg?.otherEmail === "") {
    sourceEmail = await Clipboard.readText();
  } else {
    sourceEmail = arg?.otherEmail;
  }
  sourceEmail = sourceEmail?.replace(/\s/g, "");
  if (isDuckEmail(sourceEmail)) {
    await showHUD("🤣 You already have an @duck email");
    return false;
  } else {
    otherEmailSplitted = sourceEmail?.split("@");
    switch (otherEmailSplitted!.length) {
      case 2: {
        if (arg?.doesNeedNewEmail !== "") {
          const preferences = getPreferenceValues<Preferences>();
          const url = "https://quack.duckduckgo.com/api/email/addresses";
          const options = {
            method: "POST",
            headers: {
              Authorization: preferences.duckToken,
            },
          };
          // create a new email
          await fetch(url, options)
            .then(async (res) => {
              const json: any = await res.json();
              if (typeof json.address !== "undefined") {
                await Clipboard.copy(
                  otherEmailSplitted![0] + "_at_" + otherEmailSplitted![1] + "_" + json.address + "@duck.com"
                );
                await showHUD("🎉 The " + arg?.otherEmail + " has been converted to @duck.com email");
              } else {
                await showHUD("😱 Invalid Duckduckgo token!");
              }
            })
            .catch(async (err) => await showHUD("❌ Error: " + err));
        } else {
          const preferences = getPreferenceValues<Preferences>();
          const defaultDuckMailSplitted = preferences.defaultDuckEmail.split("@");
          switch (defaultDuckMailSplitted!.length) {
            case 2: {
              await Clipboard.copy(
                otherEmailSplitted![0] +
                  "_at_" +
                  otherEmailSplitted![1] +
                  "_" +
                  defaultDuckMailSplitted[0] +
                  "@duck.com"
              );
              await showHUD("🎉 The " + arg?.otherEmail + " has been converted to @duck.com email");
              break;
            }
            default: {
              await showHUD("❌ Please check again the default @duck email in Extension Configuration");
              break;
            }
          }
        }
        break;
      }
      default: {
        await showHUD("❌ Please check again the input email you wanted to convert");
        break;
      }
    }
  }
}
