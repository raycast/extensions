import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  open,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import Cards from "./cards";

type Prefs = {
  baseUrl: string;
  accessToken: string;
  accountSlug: string;
};

type FizzyBoard = {
  id: string;
  name: string;
  all_access: boolean;
  created_at: string;
  url: string;
};

type CreateBoardValues = {
  name: string;
  allAccess: boolean;
};

type CreateCardValues = {
  title: string;
  description?: string;
};

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

async function listBoards(): Promise<FizzyBoard[]> {
  const { baseUrl, accessToken, accountSlug } = getPreferenceValues<Prefs>();

  const apiBase = normalizeBaseUrl(baseUrl);
  const res = await fetch(`${apiBase}/${accountSlug}/boards`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fizzy API ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as FizzyBoard[];
}

async function createBoard(values: CreateBoardValues): Promise<string | null> {
  const { baseUrl, accessToken, accountSlug } = getPreferenceValues<Prefs>();

  const apiBase = normalizeBaseUrl(baseUrl);
  const res = await fetch(`${apiBase}/${accountSlug}/boards`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      board: {
        name: values.name,
        all_access: values.allAccess,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fizzy API ${res.status}: ${text || res.statusText}`);
  }

  // Some endpoints respond with a Location header pointing to the new resource
  const location = res.headers.get("Location");
  if (!location) return null;
  return location.startsWith("http") ? location : `${apiBase}${location}`;
}

async function createCard(boardId: string, values: CreateCardValues): Promise<string | null> {
  const { baseUrl, accessToken, accountSlug } = getPreferenceValues<Prefs>();

  const apiBase = normalizeBaseUrl(baseUrl);
  const res = await fetch(`${apiBase}/${accountSlug}/boards/${boardId}/cards`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      card: {
        title: values.title,
        // Fizzy accepts rich text HTML; plain text is fine for a first pass
        description: values.description?.trim() ? values.description : undefined,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fizzy API ${res.status}: ${text || res.statusText}`);
  }

  const location = res.headers.get("Location");
  if (!location) return null;
  return location.startsWith("http") ? location : `${apiBase}${location}`;
}

function CreateBoardForm(props: { onCreated: () => void }) {
  const { onCreated } = props;

  async function onSubmit(values: CreateBoardValues) {
    await showToast({ style: Toast.Style.Animated, title: "Creating board…" });

    const url = await createBoard(values);

    await showToast({ style: Toast.Style.Success, title: "Board created" });
    onCreated();

    // Return to the list view
    await popToRoot({ clearSearchBar: true });

    // Optional: open the new board in the browser if we got a URL
    if (url) {
      await open(url);
    }
  }

  return (
    <Form
      navigationTitle="Create Board"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Board" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My new board" />
      <Form.Checkbox id="allAccess" title="All access" label="Allow anyone in the account" defaultValue={true} />
    </Form>
  );
}

function CreateCardForm(props: { boardId: string; boardName: string; onCreated: () => void }) {
  const { boardId, boardName, onCreated } = props;

  async function onSubmit(values: CreateCardValues) {
    await showToast({ style: Toast.Style.Animated, title: `Creating card in ${boardName}…` });

    await createCard(boardId, values);

    await showToast({ style: Toast.Style.Success, title: "Card created" });
    onCreated();

    await popToRoot({ clearSearchBar: true });
  }

  return (
    <Form
      navigationTitle={`Create Card — ${boardName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Card" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Add dark mode support" />
      <Form.TextArea id="description" title="Description" placeholder="Optional" />
    </Form>
  );
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(listBoards);

  if (error) {
    void showToast({
      style: Toast.Style.Failure,
      title: "Failed to load boards",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search boards…">
      {(data ?? []).map((b) => (
        <List.Item
          key={b.id}
          icon={Icon.List}
          title={b.name}
          subtitle={b.all_access ? "All access" : "Restricted"}
          accessories={[{ text: new Date(b.created_at).toLocaleDateString() }]}
          actions={
            <ActionPanel>
              <Action.Push title="View Cards" icon={Icon.List} target={<Cards boardId={b.id} boardName={b.name} />} />

              <Action.Push
                title="Create Card in Board"
                icon={Icon.Plus}
                target={<CreateCardForm boardId={b.id} boardName={b.name} onCreated={revalidate} />}
              />

              <Action.Push
                title="Create New Board"
                icon={Icon.PlusCircle}
                target={<CreateBoardForm onCreated={revalidate} />}
              />

              <Action.OpenInBrowser title="Open Board in Fizzy" url={b.url} />
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
