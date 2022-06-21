import { Action, ActionPanel, environment, Icon, List, Toast, ToastStyle } from "@raycast/api";
import { spawn } from "child_process";
import { join } from "path";
import { pythonbin } from "./index";

interface Item {
  title: string;
  uid: string;
  link: string;
  year: number;
  month: number;
  content: string;
  tags: [];
  authors_tag: [];
  authors_string: string;
  pdf: string;
}

export function ListBibmItem(props: { item: Item; index: number }) {
  return (
    <List.Item
      icon={Icon.Dot}
      title={props.item.uid ?? "No title"}
      actions={<Actions item={props.item} />}
      keywords={[props.item.year.toString(), props.item.title, ...props.item.authors_tag, ...props.item.tags]}
      detail={<List.Item.Detail markdown={getItemDetail(props.item)} />}
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
        {props.item.content && <Action.CopyToClipboard content={props.item.content} title="Copy bibtex" />}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function getItemDetail(item: Item): string {
  return `## ${item.title}

${item.link ? "[Open in ADS](" + item.link + ")" : ""}

${item.year && item.month ? "**Publication Date:** " + monthMap.get(item.month) + " " + item.year.toString() : ""}

${item.authors_string ? "**Authors:** " + item.authors_string : ""}

${item.tags ? "**Tags:** " + item.tags.join(", ") : ""}
`;
}

const monthMap = new Map<number, string>([
  [1, "January"],
  [2, "February"],
  [3, "March"],
  [4, "April"],
  [5, "May"],
  [6, "June"],
  [7, "July"],
  [8, "August"],
  [9, "September"],
  [10, "October"],
  [11, "November"],
  [12, "December"],
]);

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
