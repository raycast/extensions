import { Action, ActionPanel, Clipboard, Form, Icon, open, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useCachedPromise, useForm, useLocalStorage } from "@raycast/utils";

import type { Account } from "../lib/accounts";
import { api, fetchBoard, gather, userId } from "../lib/hackban";
import { ManageAccountsAction } from "./accounts";

type Values = {
  /** `<account id>:<board id>`: board IDs are only unique within a server. */
  board: string;
  listId: string;
  title: string;
  description: string;
  due: Date | null;
  position: string;
  assign: boolean;
};

const fetchWorkspaces = () => gather((api) => api.workspaces());
const boardKey = (account: Account, boardId: string) => `${account.id}:${boardId}`;

/**
 * Create a card on any account's boards. Opened from a board (`board`, maybe with a list),
 * it's fixed to that board and closes after saving.
 */
export function CreateCardForm({
  board: fixed,
  onCreated,
}: {
  board?: { account: Account; boardId: string; listId?: string };
  onCreated?: () => void;
}) {
  const { pop } = useNavigation();
  const {
    data: all,
    isLoading: loadingWorkspaces,
    revalidate: reloadWorkspaces,
  } = useCachedPromise(fetchWorkspaces, [], { execute: !fixed });
  const { value: lastBoard, setValue: setLastBoard, isLoading: loadingLast } = useLocalStorage<string>("last-board");

  const choices = (all?.results ?? []).flatMap(({ account, data }) =>
    data.flatMap((w) => w.boards.map((b) => ({ account, workspace: w, board: b, key: boardKey(account, b.id) }))),
  );

  const { handleSubmit, itemProps, values, reset, focus } = useForm<Values>({
    initialValues: {
      board: fixed ? boardKey(fixed.account, fixed.boardId) : "",
      listId: fixed?.listId ?? "",
      position: "bottom",
      assign: true,
    },
    // Opened from a board there's no Board field to fill in.
    validation: {
      ...(fixed ? {} : { board: FormValidation.Required }),
      listId: FormValidation.Required,
      title: FormValidation.Required,
    },
    async onSubmit(v) {
      const account = fixed?.account ?? choices.find((c) => c.key === v.board)?.account;
      if (!account) return false;
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating card" });
      const hackban = api(account);
      let card: { id: string; url: string };
      try {
        let due = v.due;
        // A day without a time: noon, like Hackban's own date picker.
        if (due && Form.DatePicker.isFullDay(due)) due = new Date(new Date(due).setHours(12, 0, 0, 0));
        card = await hackban.createCard({
          listId: v.listId,
          title: v.title.trim(),
          description: v.description?.trim() || undefined,
          due: due?.toISOString(),
          position: v.position === "top" ? "top" : "bottom",
        });
      } catch (e) {
        await showFailureToast(e, { title: "Couldn't create card" });
        return;
      }
      // The card exists from here on, so the form clears even if adding you fails: trying again would make a second card.
      let unassigned: string | undefined;
      if (v.assign) {
        try {
          await hackban.setMember(card.id, await userId(account), true);
        } catch (e) {
          unassigned = (e instanceof Error && e.message) || "Add yourself on Hackban instead";
        }
      }
      toast.style = unassigned ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = unassigned ? "Card created, but couldn't add you" : "Card created";
      toast.message = unassigned ?? v.title.trim();
      toast.primaryAction = { title: "Open in Browser", onAction: () => open(card.url) };
      toast.secondaryAction = { title: "Copy Link", onAction: () => Clipboard.copy(card.url) };
      onCreated?.();
      if (fixed) return pop();
      reset({ ...v, title: "", description: "", due: null });
      focus("title");
    },
  });

  // The dropdowns always show one of their own items (Raycast warns otherwise): the board picked here,
  // else the last one used, else the first; and the list picked, else the board's first list.
  const picked =
    choices.find((c) => c.key === values.board) ??
    (loadingLast ? undefined : (choices.find((c) => c.key === lastBoard) ?? choices[0]));
  const account = fixed?.account ?? picked?.account;
  const boardId = fixed?.boardId ?? picked?.board.id ?? "";
  // Only runs once there's an account (see `execute`).
  const {
    data: board,
    isLoading: loadingBoard,
    revalidate: reloadBoard,
  } = useCachedPromise(fetchBoard, [account as Account, boardId], {
    execute: !!account && !!boardId,
  });
  const lists = board?.id === boardId ? board.lists : [];
  const listId = lists.some((l) => l.id === values.listId) ? values.listId : (lists[0]?.id ?? "");

  const many = (all?.accounts.length ?? 0) > 1;
  const missing = [...(all?.signedOut ?? []), ...(all?.errors.map((e) => e.account) ?? [])];

  return (
    <Form
      isLoading={loadingWorkspaces || loadingBoard}
      navigationTitle={board && fixed ? `New Card on ${board.name}` : "New Card"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Card" icon={Icon.NewDocument} onSubmit={handleSubmit} />
          <ActionPanel.Section>
            {/* revalidate runs even when `execute` is off, so only reload what this form loaded. */}
            <ManageAccountsAction onChange={fixed ? reloadBoard : reloadWorkspaces} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {fixed ? (
        <Form.Description title="Board" text={board?.name ?? "Loading…"} />
      ) : (
        <Form.Dropdown
          title="Board"
          {...itemProps.board}
          value={picked?.key ?? ""}
          onChange={(key) => {
            itemProps.board.onChange?.(key);
            if (key) setLastBoard(key);
          }}
        >
          {!picked && (
            <Form.Dropdown.Item title={loadingWorkspaces || loadingLast ? "Loading…" : "No boards"} value="" />
          )}
          {(all?.results ?? []).flatMap(({ account, data }) =>
            data.map((w) => (
              <Form.Dropdown.Section
                key={`${account.id}:${w.id}`}
                title={many ? `${w.name} · ${account.label}` : w.name}
              >
                {w.boards.map((b) => (
                  <Form.Dropdown.Item
                    key={b.id}
                    title={b.name}
                    value={boardKey(account, b.id)}
                    icon={b.starred ? Icon.Star : Icon.AppWindowGrid3x3}
                  />
                ))}
              </Form.Dropdown.Section>
            )),
          )}
        </Form.Dropdown>
      )}
      {missing.length > 0 && (
        <Form.Description
          text={`Boards from ${missing.map((a) => a.label).join(", ")} aren't here: sign in again under Manage Accounts (⌘⇧A).`}
        />
      )}
      <Form.Dropdown title="List" {...itemProps.listId} value={listId}>
        {lists.length ? (
          lists.map((l) => <Form.Dropdown.Item key={l.id} title={l.name} value={l.id} />)
        ) : (
          <Form.Dropdown.Item title={loadingBoard || !board ? "Loading…" : "No lists"} value="" />
        )}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField title="Title" placeholder="What needs doing?" autoFocus {...itemProps.title} />
      <Form.TextArea title="Description" placeholder="Markdown works" enableMarkdown {...itemProps.description} />
      <Form.DatePicker title="Due" {...itemProps.due} />
      <Form.Dropdown title="Position" {...itemProps.position}>
        <Form.Dropdown.Item title="Bottom of list" value="bottom" />
        <Form.Dropdown.Item title="Top of list" value="top" />
      </Form.Dropdown>
      <Form.Checkbox label="Add me to the card" {...itemProps.assign} />
    </Form>
  );
}
