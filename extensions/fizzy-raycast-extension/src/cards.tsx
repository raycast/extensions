import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

/* =======================
   Types
======================= */

type Prefs = {
  baseUrl: string;
  accessToken: string;
  accountSlug: string;
};

type FizzyCard = {
  id: string;
  number: number;
  title: string;
  last_active_at: string;
  url: string;
};

type CardsProps = {
  boardId: string;
  boardName: string;
};

type CreateCardValues = {
  title: string;
  description?: string;
};

/* =======================
   Helpers
======================= */

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

async function listCards(boardId: string): Promise<FizzyCard[]> {
  const { baseUrl, accessToken, accountSlug } = getPreferenceValues<Prefs>();
  const apiBase = normalizeBaseUrl(baseUrl);

  const res = await fetch(`${apiBase}/${accountSlug}/cards?board_ids[]=${encodeURIComponent(boardId)}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fizzy API ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as FizzyCard[];
}

async function createCard(boardId: string, values: CreateCardValues): Promise<void> {
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
        description: values.description?.trim() ? values.description : undefined,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fizzy API ${res.status}: ${text || res.statusText}`);
  }
}

async function deleteCard(cardNumber: number): Promise<void> {
  const { baseUrl, accessToken, accountSlug } = getPreferenceValues<Prefs>();
  const apiBase = normalizeBaseUrl(baseUrl);

  const res = await fetch(`${apiBase}/${accountSlug}/cards/${cardNumber}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fizzy API ${res.status}: ${text || res.statusText}`);
  }
}

/* =======================
   Create Card Form
======================= */

function CreateCardForm(props: { boardId: string; boardName: string; onCreated: () => void }) {
  const { boardId, boardName, onCreated } = props;
  const navigation = useNavigation();

  async function onSubmit(values: CreateCardValues) {
    await showToast({
      style: Toast.Style.Animated,
      title: `Creating card in ${boardName}…`,
    });

    await createCard(boardId, values);

    await showToast({
      style: Toast.Style.Success,
      title: "Card created",
    });

    onCreated();
    navigation.pop();
  }

  return (
    <Form
      navigationTitle={`Add Card — ${boardName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Card" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" />
      <Form.TextArea id="description" title="Description" />
    </Form>
  );
}

/* =======================
   Cards List
======================= */

export default function Cards({ boardId, boardName }: CardsProps) {
  const { data, isLoading, error, revalidate } = useCachedPromise(() => listCards(boardId), [boardId]);

  if (error) {
    void showToast({
      style: Toast.Style.Failure,
      title: "Failed to load cards",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return (
    <List isLoading={isLoading} navigationTitle={boardName}>
      {/* Empty state */}
      {!isLoading && (data?.length ?? 0) === 0 ? (
        <List.EmptyView
          icon={Icon.Plus}
          title="No cards yet"
          description="Create the first card for this board."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Card"
                icon={Icon.Plus}
                target={<CreateCardForm boardId={boardId} boardName={boardName} onCreated={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : null}

      {/* Cards */}
      {(data ?? []).map((c) => (
        <List.Item
          key={c.id}
          icon={Icon.Circle}
          title={`#${c.number} ${c.title}`}
          accessories={[{ text: new Date(c.last_active_at).toLocaleDateString() }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Card"
                icon={Icon.Plus}
                target={<CreateCardForm boardId={boardId} boardName={boardName} onCreated={revalidate} />}
              />

              <Action.OpenInBrowser title="Open Card in Fizzy" url={c.url} />

              <Action
                title="Delete Card…"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const ok = await confirmAlert({
                    title: "Delete this card?",
                    message: `This will permanently delete “${c.title}”.`,
                    primaryAction: {
                      title: "Delete",
                      style: Action.Style.Destructive,
                    },
                  });

                  if (!ok) return;

                  await showToast({
                    style: Toast.Style.Animated,
                    title: "Deleting card…",
                  });

                  try {
                    await deleteCard(c.number);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Card deleted",
                    });
                    revalidate();
                  } catch (e) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to delete card",
                      message: e instanceof Error ? e.message : String(e),
                    });
                  }
                }}
              />

              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
