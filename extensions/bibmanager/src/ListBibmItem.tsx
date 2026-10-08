import { Dispatch, SetStateAction } from "react";
import { Action, ActionPanel, Color, environment, Icon, Keyboard, List, Toast } from "@raycast/api";
import { spawn } from "child_process";
import { createInterface } from "readline";
import { join } from "path";
import { pythonbin } from "./index";
import { Item, State } from "./types";

const openADSShortcut: Keyboard.Shortcut = { modifiers: ["cmd"], key: "enter" };
const copyLinkShortcut: Keyboard.Shortcut = { modifiers: ["cmd"], key: "l" };
const pasteLinkShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "l" };
const copyBibkeyShortcut: Keyboard.Shortcut = { modifiers: ["cmd"], key: "b" };
const pasteBibkeyShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "b" };
const copyBibtexShortcut: Keyboard.Shortcut = { modifiers: ["cmd"], key: "t" };
const pasteBibtexShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "t" };

export function ListBibmItem(props: { item: Item; items: Item[]; setState: Dispatch<SetStateAction<State>> }) {
  return (
    <List.Item
      icon={Icon.Dot}
      title={props.item.uid ?? "No title"}
      actions={<Actions item={props.item} items={props.items} setState={props.setState} />}
      detail={getItemDetail(props.item)}
    />
  );
}

function Actions(props: { item: Item; items: Item[]; setState: Dispatch<SetStateAction<State>> }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        {props.item.pdf && <Action.OpenWith path={props.item.pdf} title="Open PDF" />}
        {!props.item.pdf && (
          <Action.SubmitForm
            title="Download PDF"
            icon={Icon.Download}
            onSubmit={() => DownloadPDF(props.item.uid, props.items, props.setState)}
          />
        )}
        {props.item.link && (
          <Action.OpenInBrowser url={props.item.link} title="Open ADS Link in Browser" shortcut={openADSShortcut} />
        )}
        {props.item.uid && (
          <Action.CopyToClipboard content={props.item.uid} title="Copy bibkey" shortcut={copyBibkeyShortcut} />
        )}
        {props.item.uid && (
          <Action.Paste content={props.item.uid} title="Paste bibkey" shortcut={pasteBibkeyShortcut} />
        )}
        {props.item.content && (
          <Action.CopyToClipboard content={props.item.content} title="Copy bibtex" shortcut={copyBibtexShortcut} />
        )}
        {props.item.content && (
          <Action.Paste content={props.item.content} title="Paste bibtex" shortcut={pasteBibtexShortcut} />
        )}
        {props.item.link && (
          <Action.CopyToClipboard content={props.item.link} title="Copy ADS Link" shortcut={copyLinkShortcut} />
        )}
        {props.item.link && (
          <Action.Paste content={props.item.link} title="Paste ADS Link" shortcut={pasteLinkShortcut} />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );

  function DownloadPDF(key: string, items: Item[], setState: Dispatch<SetStateAction<State>>) {
    const toast = new Toast({
      style: Toast.Style.Animated,
      title: "Downloading PDF",
    });
    toast.show();

    const python = spawn(pythonbin, [join(environment.assetsPath, "bibm_download.py"), key]);
    const lineReader = createInterface({ input: python.stdout });

    lineReader.on("line", (line) => {
      if (line.includes("PDF: ")) {
        const PDFstring = line.substring(5);
        const index = items.findIndex((item: Item) => item.uid == key);
        items[index].pdf = PDFstring;
        setState((previous) => ({ ...previous, items: items }));
        toast.style = Toast.Style.Success;
        toast.title = "Download succeeded";
        return;
      } else if (line.includes("[]yes [n]o.")) {
        toast.title = "Bibmanager needs input";
        toast.style = Toast.Style.Failure;
        toast.message = "Try manually with bibmanager CLI";
        return;
      } else if (line.includes("out of time")) {
        toast.title = "Download timed out";
        toast.style = Toast.Style.Failure;
        toast.message = "Try manually with bibmanager CLI";
        return;
      }
    });
    python.on("error", () => {
      toast.style = Toast.Style.Failure;
      toast.title = "Download failed";
      toast.message = "Try manually with bibmanager CLI";
      return;
    });
    python.on("close", (code) => {
      if (code != 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Download failed";
        toast.message = "Try manually with bibmanager CLI";
      }
      return;
    });
  }
}

function getItemDetail(item: Item) {
  return (
    <List.Item.Detail
      markdown={getMarkdown(item)}
      metadata={
        <List.Item.Detail.Metadata>
          {item.tags.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {item.tags.map((tag, uid) => (
                <List.Item.Detail.Metadata.TagList.Item key={uid} text={tag} color={stringToColour(tag)} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          {item.tags.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {item.link && <List.Item.Detail.Metadata.Link title="SAO/NASA ADS" text={item.adscode} target={item.link} />}
          {item.link && <List.Item.Detail.Metadata.Separator />}
          <List.Item.Detail.Metadata.Label
            title="Publication Date"
            text={`${item.year && item.month ? getMonth(item.month) + " " + item.year.toString() : ""}`}
          />
          {item.keywords.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {item.keywords.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Keywords">
              {item.keywords.map((kw, uid) => (
                <List.Item.Detail.Metadata.TagList.Item key={uid} text={kw} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function getMarkdown(item: Item) {
  return `## ${item.title}
  
  **Authors**: ${item.authors_string ? item.authors_string : ""}
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

function stringToColour(text: string) {
  const colors: Color.ColorLike[] = [
    Color.Blue,
    Color.Brown,
    Color.Green,
    Color.Magenta,
    Color.Orange,
    Color.Purple,
    Color.Red,
    Color.Yellow,
  ];

  let hash = 0;
  if (text.length === 0) return colors[0];
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  hash = ((hash % colors.length) + colors.length) % colors.length;
  return colors[hash];
}
