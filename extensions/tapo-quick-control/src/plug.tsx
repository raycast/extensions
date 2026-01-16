import { Action, ActionPanel, getPreferenceValues, showToast, Toast, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { getStrings } from "./lib/i18n";
import { setPlugPower, getInfo } from "./lib/tapo";
import { Prefs } from "./lib/types";

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const strings = getStrings(prefs);

  const [infoMd, setInfoMd] = useState<string>(strings.deviceChecking);

  useEffect(() => {
    (async () => {
      try {
        const info = await getInfo(prefs, "P110");
        setInfoMd("```json\n" + JSON.stringify(info, null, 2) + "\n```");
      } catch (e) {
        setInfoMd(`${strings.errorPrefix}: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
  }, []);

  return (
    <Detail
      markdown={infoMd}
      actions={
        <ActionPanel>
          <Action title={strings.open} onAction={() => runPower(prefs, true, strings)} />
          <Action title={strings.close} onAction={() => runPower(prefs, false, strings)} />
        </ActionPanel>
      }
    />
  );
}

async function runPower(prefs: Prefs, on: boolean, strings: ReturnType<typeof getStrings>) {
  const toast = await showToast({ style: Toast.Style.Animated, title: on ? strings.openingNow : strings.closingNow });
  try {
    await setPlugPower(prefs, on);
    toast.style = Toast.Style.Success;
    toast.title = on ? strings.opened : strings.closed;
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = strings.failed;
    toast.message = e instanceof Error ? e.message : String(e);
  }
}
