import { useEffect, useState } from "react";
import { Action, ActionPanel, environment, Icon, List, Toast, ToastStyle } from "@raycast/api";
import { spawn } from "child_process";
import { join } from "path";
import { pythonbin } from "./index";

interface Item {
  uid: string;
  title: string;
  link: string;
  pdf: string;
  year: string;
  authors: [];
}

export function ListBibmItem(props: { item: Item; index: number }) {
  const [state, setState] = useState<{ icon: string; accessories: List.Item.Accessory[] }>({
    icon: Icon.Dot,
    accessories: [],
  });
  useEffect(() => {
    const accessories = [];
    accessories.push({ icon: Icon.Clock, text: props.item.year.toString() });
    const icon = Icon.Dot;

    setState({ icon, accessories });
  }, [props.item, props.index]);

  return (
    <List.Item
      icon={state.icon}
      title={props.item.uid ?? "No title"}
      subtitle={props.item.title}
      accessories={state.accessories}
      actions={<Actions item={props.item} />}
      keywords={[props.item.year.toString(), props.item.title, ...props.item.authors]}
    />
  );
}

function Actions(props: { item: Item }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        {props.item.pdf && (
          <Action.OpenWith path={props.item.pdf} title="Open PDF" shortcut={{ modifiers: [], key: "enter" }} />
        )}
        {props.item.link && <Action.OpenInBrowser url={props.item.link} title="Open ADS Link in Browser" />}
        {!props.item.pdf && (
          <Action.SubmitForm title="Download PDF" icon={Icon.Download} onSubmit={() => DownloadPDF(props.item.uid)} />
        )}
        {props.item.link && <Action.CopyToClipboard content={props.item.link} title="Copy ADS Link" />}
        {props.item.uid && <Action.CopyToClipboard content={props.item.uid} title="Copy bibkey" />}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function DownloadPDF(key: string) {
  const toastload = new Toast({
    style: ToastStyle.Animated,
    title: "Downloading PDF",
  });
  const toastsuccess = new Toast({
    style: ToastStyle.Success,
    title: "Download succeeded",
    message: "Rerun to open",
  });
  const toastfail = new Toast({
    style: ToastStyle.Failure,
    title: "Download error",
    message: "Try manually with bibmanager CLI",
  });

  const python = spawn(pythonbin, [join(environment.assetsPath, "bibm_download.py"), key]);
  toastload.show();
  python.on("close", (code) => {
    if (code === 0) {
      toastsuccess.show();
    } else {
      toastfail.show();
    }
  });
  python.on("error", () => {
    toastfail.show();
    return;
  });
}
