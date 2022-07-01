import { Action, ActionPanel, environment, Icon, List, Toast } from "@raycast/api";
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
      detail={getItemDetail(props.item)}
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
        {props.item.uid && <Action.CopyToClipboard content={props.item.uid} title="Copy bibkey" />}
        {props.item.content && <Action.CopyToClipboard content={props.item.content} title="Copy bibtex" />}
        {props.item.link && <Action.CopyToClipboard content={props.item.link} title="Copy ADS Link" />}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function getItemDetail(item: Item) {
  return (
    <List.Item.Detail
      markdown={getMarkdown(item)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Tags" text={`${item.tags.length > 0 ? item.tags.join(", ") : ""}`} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Publication Date"
            text={`${item.year && item.month ? getMonth(item.month) + " " + item.year.toString() : ""}`}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function getMarkdown(item: Item) {
  return `## ${item.title}
  
  **Authors**: ${item.authors_string ? item.authors_string : ""}
  
  ${item.link ? "[Open in ADS](" + item.link + ")" : ""}
  
  `;
}

function getMonth(key: number) {
  return monthMap.get(key) || "";
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
  const toast = new Toast({
    style: Toast.Style.Animated,
    title: "Downloading PDF",
  });
  toast.show();

  const python = spawn(pythonbin, [join(environment.assetsPath, "bibm_download.py"), key]);
  python.on("close", (code) => {
    if (code === 0) {
      toast.style = Toast.Style.Success;
      toast.title = "Download succeeded";
      toast.message = "Rerun to open";
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Download error";
      toast.message = "Try manually with bibmanager CLI";
    }
  });
  python.on("error", () => {
    toast.style = Toast.Style.Failure;
    toast.title = "Download error";
    toast.message = "Try manually with bibmanager CLI";
    return;
  });
}
