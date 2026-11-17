import {
  Action,
  ActionPanel,
  environment,
  getFrontmostApplication,
  Icon,
  List,
  useNavigation,
  type Image,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { RecipientList } from "./components/RecipientList";
import { FilesForm, TextForm } from "./components/SendForms";
import { contentKind, contentLocation, contentTitle, readClipboardContent, type SendContent } from "./lib/content";
import { fileManagerName, getSelectedPaths } from "./lib/selection";

function contentIcon(content: SendContent): Image.ImageLike {
  switch (content.kind) {
    case "files":
      return { fileIcon: content.paths[0] };
    case "image":
      return { source: content.path };
    case "text":
      return Icon.Text;
  }
}

function ContentItem({ id, content }: { id: string; content: SendContent }) {
  const location = contentLocation(content);
  return (
    <List.Item
      id={id}
      icon={contentIcon(content)}
      title={contentTitle(content)}
      subtitle={[contentKind(content), location].filter(Boolean).join(" · ")}
      actions={
        <ActionPanel>
          <Action.Push
            title={`Send ${contentTitle(content)}…`}
            icon={Icon.ArrowRight}
            target={<RecipientList content={content} isNested />}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  // undefined = still reading, null = nothing there.
  const [selection, setSelection] = useState<SendContent | null>();
  const [clipboard, setClipboard] = useState<SendContent | null>();
  const [cameFromFileManager, setCameFromFileManager] = useState(false);

  useEffect(() => {
    getSelectedPaths()
      .then((paths) =>
        setSelection(paths.length ? { kind: "files", paths, source: `Selected in ${fileManagerName}` } : null),
      )
      .catch(() => setSelection(null));
    readClipboardContent(environment.supportPath)
      .then((content) => setClipboard(content ?? null))
      .catch(() => setClipboard(null));
    // Finder's selection survives after you switch away, so only lead with it if you came from there.
    getFrontmostApplication()
      .then((app) => setCameFromFileManager(app.bundleId === "com.apple.finder" || /explorer\.exe$/i.test(app.path)))
      .catch(() => {});
  }, []);

  const selectionSection = selection && (
    <List.Section key="selection" title={`Selected in ${fileManagerName}`}>
      <ContentItem id="selection" content={selection} />
    </List.Section>
  );
  const clipboardSection = clipboard && (
    <List.Section key="clipboard" title="Clipboard">
      <ContentItem id="clipboard" content={clipboard} />
    </List.Section>
  );

  return (
    <List
      searchBarPlaceholder="What do you want to send?"
      isLoading={selection === undefined || clipboard === undefined}
    >
      {cameFromFileManager ? [selectionSection, clipboardSection] : [clipboardSection, selectionSection]}
      <List.Section title="Something Else">
        <List.Item
          id="text"
          icon={Icon.Text}
          title="Type Text…"
          subtitle="Arrives as a .txt file"
          actions={
            <ActionPanel>
              <Action.Push
                title="Type Text…"
                icon={Icon.Text}
                target={
                  <TextForm
                    navigationTitle="Type Text to Send"
                    submitTitle="Choose Recipient"
                    onSubmit={(text) =>
                      push(<RecipientList content={{ kind: "text", text, source: "Typed" }} isNested />)
                    }
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="files"
          icon={Icon.Folder}
          title="Choose Files…"
          subtitle="Any files or folders"
          actions={
            <ActionPanel>
              <Action.Push
                title="Choose Files…"
                icon={Icon.Folder}
                target={
                  <FilesForm
                    onSubmit={(paths) =>
                      push(<RecipientList content={{ kind: "files", paths, source: "Chosen files" }} isNested />)
                    }
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
