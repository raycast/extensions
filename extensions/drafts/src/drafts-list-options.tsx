import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  popToRoot,
  showToast,
  Toast,
  List,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import Style = Toast.Style;
import { LocalStorage } from "@raycast/api";
import { CallbackUrl } from "./utils/CallbackUrlUtils";
import { CallbackBaseUrls } from "./utils/Defines";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";

class Draft {
  public title = "";
  public uuid = "";
  public preferPrepend = false;
  public prefix = "";
  constructor(title: string, uuid: string, prefix: string, preferPrepend: boolean) {
    this.setTitle(title);
    this.setUuid(uuid);
    this.setPreferPrepend(preferPrepend);
    this.setPrefix(prefix);
  }

  setTitle(title: string) {
    this.title = title;
  }

  setUuid(uuid: string) {
    this.uuid = uuid;
  }

  setPrefix(prefix: string) {
    this.prefix = prefix;
  }

  setPreferPrepend(preferPrepend: boolean) {
    this.preferPrepend = preferPrepend;
  }
}

interface DraftPreAppend {
  draftTitle: string;
  draftUuid: string;
  draftPrefix: string;
}

function AddDraft(props: { defaultTitle?: string; onCreate: (draft: Draft) => void }) {
  return <Action.Push icon={Icon.Plus} title="Add Draft" target={<AddDraftForm onCreate={props.onCreate} />} />;
}

interface CommandForm {
  content: string;
}

function AppendToDraft(draft: DraftPreAppend) {
  async function handleAppendAction(values: CommandForm) {
    const callbackUrl = new CallbackUrl(CallbackBaseUrls.APPEND_TO_DRAFT);
    callbackUrl.addParam({ name: "uuid", value: draft.draftUuid });
    callbackUrl.addParam({ name: "text", value: draft.draftPrefix + values.content });
    callbackUrl.openCallbackUrl();
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleAppendAction} title={'Append to Draft "' + draft.draftTitle + '"'} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Text"
        placeholder="Enter text to append to draft"
        defaultValue=""
        autoFocus={true}
      />
    </Form>
  );
}

function PrependToDraft(draft: DraftPreAppend) {
  async function handlePrependAction(values: CommandForm) {
    const callbackUrl = new CallbackUrl(CallbackBaseUrls.PREPEND_TO_DRAFT);
    callbackUrl.addParam({ name: "uuid", value: draft.draftUuid });
    callbackUrl.addParam({ name: "text", value: draft.draftPrefix + values.content });
    callbackUrl.openCallbackUrl();
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handlePrependAction} title={'Prepend to Draft "' + draft.draftTitle + '"'} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Text"
        placeholder="Enter text to prepend to draft"
        defaultValue=""
        autoFocus={true}
      />
    </Form>
  );
}

function RemoveDraft(props: { onDelete: () => void }) {
  return <Action icon={Icon.Trash} title="Remove Draft" onAction={props.onDelete} />;
}

function AddDraftForm(props: { onCreate: (draft: Draft) => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { title: string; uuid: string; prefix: string; preferesPrepend: boolean }) {
    let isValidInput = true;
    let errorTitle = "";
    let errorMessage = "";
    if (values.title.length == 0) {
      isValidInput = false;
      errorTitle = "Title must not be empty!";
    }
    if (isValidInput && values.uuid.length == 0) {
      isValidInput = false;
      errorTitle = "UUID must not be empty!";
      errorMessage = "copy the UUID from an existing Draft";
    }
    if (isValidInput) {
      props.onCreate(new Draft(values.title, values.uuid, values.prefix, values.preferesPrepend));
      pop();
    } else {
      await showToast({
        style: Style.Failure,
        title: errorTitle,
        message: errorMessage,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Draft" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title for the Draft"
        placeholder="user defined title for the Draft"
        info="choose any title you like to see in the list in raycast - the title doesn't need to match between Raycast and Drafts"
        autoFocus={true}
      />
      <Form.TextField
        id="uuid"
        title="UUID of the Draft"
        placeholder="paste the uuid of the Draft"
        info="copy & paste the uuid of the Draft you want to configure by clicking on the (i) symbol in the bottom bar"
      />
      <Form.TextField
        id="prefix"
        title="prefix"
        placeholder={"prefixed text"}
        info={'the prefix will be prepended to the input text, use "- " for a bullet list or "- [ ] " for tasks'}
      />
      <Form.Checkbox
        id="preferesPrepend"
        title="Prepend to Draft"
        defaultValue={false}
        label="if checked the text will be prepended to this Draft"
      />
    </Form>
  );
}

export default function Command() {
  // app installation check (shows Toast if Drafts is not installed)
  checkAppInstallation();

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function readStoredDrafts() {
    const retrievedStoredDrafts = await LocalStorage.getItem<string>("stored-drafts");
    if (retrievedStoredDrafts) {
      const drafts: Draft[] = JSON.parse(retrievedStoredDrafts);
      setDrafts(drafts);
    }
    setIsLoading(false);
  }
  async function updateStoredDraftNames(newDrafts: Draft[]) {
    const stringifiedDrafts = JSON.stringify(newDrafts);
    await LocalStorage.setItem("stored-drafts", stringifiedDrafts);
    readStoredDrafts();
  }

  if (drafts.length == 0) {
    readStoredDrafts();
  }

  async function handleAddDraft(draft: Draft) {
    const newDrafts = [...drafts, draft];
    updateStoredDraftNames(newDrafts);
    setDrafts(newDrafts);
    await showToast({
      style: Style.Success,
      title: 'Added Draft "' + draft.title + '"',
    });
  }

  async function handleRemoveDraft(index: number) {
    const newDrafts = [...drafts];
    newDrafts.splice(index, 1);
    updateStoredDraftNames(newDrafts);
    setDrafts(newDrafts);
    await showToast({
      style: Style.Success,
      title: "Removed Draft",
    });
  }

  function dispatchAppendOrPrependAction(draft: Draft) {
    if (draft.preferPrepend) {
      return (
        <Action.Push
          title="Prepend to Draft"
          target={<PrependToDraft draftTitle={draft.title} draftUuid={draft.uuid} draftPrefix={draft.prefix} />}
        />
      );
    } else {
      return (
        <Action.Push
          title="Append to Draft"
          target={<AppendToDraft draftTitle={draft.title} draftUuid={draft.uuid} draftPrefix={draft.prefix} />}
        />
      );
    }
  }

  function dispatchCreateQuicklinkAction(draft: Draft) {
    if (draft.preferPrepend) {
      return (
        <Action.CreateQuicklink
          quicklink={{
            link:
              CallbackBaseUrls.PREPEND_TO_DRAFT +
              "uuid=" +
              draft.uuid +
              "&text=" +
              encodeURIComponent(draft.prefix) +
              "{text}",
          }}
          icon={Icon.Link}
          title={'Create Quicklink to Prepend to Draft "' + draft.title + '"'}
        />
      );
    } else {
      return (
        <Action.CreateQuicklink
          quicklink={{
            link:
              CallbackBaseUrls.APPEND_TO_DRAFT +
              "uuid=" +
              draft.uuid +
              "&text=" +
              encodeURIComponent(draft.prefix) +
              "{text}",
          }}
          icon={Icon.Link}
          title={'Create Quicklink to Append to Draft "' + draft.title + '"'}
        />
      );
    }
  }

  return (
    <List
      navigationTitle="Search Drafts"
      searchBarPlaceholder="Search Drafts you want to append / prepend text to"
      actions={
        <ActionPanel>
          <AddDraft onCreate={handleAddDraft} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <List.EmptyView
        actions={
          <ActionPanel>
            <AddDraft onCreate={handleAddDraft} />
          </ActionPanel>
        }
        title="No Drafts Configured!"
        description="Configure Quick Drafts you want to append / prepend text to from Raycast"
        icon="⚙️"
      />
      {drafts.map((draft, index) => (
        <List.Item
          key={index}
          title={draft.title}
          icon={Icon.List}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {dispatchAppendOrPrependAction(draft)}
                {dispatchCreateQuicklinkAction(draft)}
                <RemoveDraft onDelete={() => handleRemoveDraft(index)} />
              </ActionPanel.Section>
              <AddDraft onCreate={handleAddDraft} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
