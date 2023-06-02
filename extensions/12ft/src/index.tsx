import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "crypto";
import { useState } from "react";
import { Link } from "./types/link";
import { useFetchStoredLinks } from "./hooks/useFetchStoredLinks";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [links, setLinks] = useState<Link[]>([]);

  useFetchStoredLinks(setLinks, setIsLoading);

  async function handleCreate(link: Link) {
    const newTodos = [...links, link];
    setLinks(newTodos);
    await LocalStorage.setItem(link.id, JSON.stringify(link));
    Clipboard.copy(link.unpaywalledLink);
    showToast(Toast.Style.Success, "Link created and copied to clipboard");
  }

  async function handleDelete(index: number) {
    const linkToDelete = links[index];
    await LocalStorage.removeItem(linkToDelete.id);
    setLinks((prevLinks) => prevLinks.filter((link) => link.id !== linkToDelete.id));
    showToast(Toast.Style.Success, "Link deleted");
  }

  function handleCopy(index: number) {
    Clipboard.copy(links[index].unpaywalledLink);
    showToast(Toast.Style.Success, "Copied to clipboard");
  }

  return (
    <List
      actions={
        <ActionPanel>
          <CreateLinkAction onCreate={handleCreate} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      {links.map((link, index) => (
        <List.Item
          key={index}
          icon={Icon.Document}
          title={link.paywalledLink}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open in Browser" url={link.unpaywalledLink} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CreateLinkAction onCreate={handleCreate} />
                <DeleteLinkAction onDelete={() => handleDelete(index)} />
                <CopyLinkAction link={link} onCopy={() => handleCopy(index)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Prepend12ftIO(unpaywalledLink: string) {
  return "https://12ft.io/" + unpaywalledLink;
}

function CreateLinkForm(props: { onCreate: (link: Link) => void }) {
  const { pop } = useNavigation();

  function handleSubmit(values: { paywalledLink: string }) {
    props.onCreate({
      id: randomUUID(),
      paywalledLink: values.paywalledLink,
      unpaywalledLink: Prepend12ftIO(values.paywalledLink),
    });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create a Link" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="paywalledLink" title="URL" />
    </Form>
  );
}

function CreateLinkAction(props: { onCreate: (link: Link) => void }) {
  return (
    <Action.Push
      icon={Icon.Link}
      title="Generate a Link"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateLinkForm onCreate={props.onCreate} />}
    />
  );
}

function DeleteLinkAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Link"
      shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
      onAction={props.onDelete}
    />
  );
}

function CopyLinkAction(props: { link: Link; onCopy: () => void }) {
  return (
    <Action
      icon={Icon.Clipboard}
      title="Copy Link"
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      onAction={props.onCopy}
    />
  );
}
