import { Action, ActionPanel, Form, Toast, showHUD, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { ApiError, fetchBoards, sendUpdate } from "./api";
import { clearOAuthTokens } from "./auth";
import type { Board, Density, FontWeight, PanelId, TextSize } from "./types";

const PANEL_OPTIONS: { value: string; title: string }[] = [
  { value: "1", title: "Panel 1" },
  { value: "2", title: "Panel 2" },
  { value: "3", title: "Panel 3" },
  { value: "4", title: "Panel 4" },
];

const SIZE_OPTIONS: { value: TextSize; title: string }[] = [
  { value: "small", title: "Small" },
  { value: "medium", title: "Medium" },
  { value: "large", title: "Large" },
];

const WEIGHT_OPTIONS: { value: FontWeight; title: string }[] = [
  { value: "regular", title: "Regular" },
  { value: "semibold", title: "Semibold" },
  { value: "bold", title: "Bold" },
];

const DENSITY_OPTIONS: { value: Density; title: string }[] = [
  { value: "compact", title: "Compact" },
  { value: "standard", title: "Standard" },
  { value: "spacious", title: "Spacious" },
];

export default function SendUpdateForm() {
  const { pop } = useNavigation();
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);

  async function loadBoards() {
    setBoardsLoading(true);
    try {
      const list = await fetchBoards();
      setBoards(list);
    } catch (err) {
      await showToast(Toast.Style.Failure, "Could not load boards", (err as Error).message);
    } finally {
      setBoardsLoading(false);
    }
  }

  useEffect(() => {
    void loadBoards();
  }, []);

  async function onSubmit(values: {
    message: string;
    boardId: string;
    panelId: string;
    density: string;
    fullPanel: boolean;
    size: string;
    weight: string;
    color?: string;
    background?: string;
  }) {
    const text = values.message.trim();
    if (!text) {
      await showToast(Toast.Style.Failure, "Message is required");
      return;
    }
    try {
      const res = await sendUpdate({
        boardId: values.boardId || undefined,
        blocks: [
          {
            text,
            size: values.size as TextSize,
            weight: values.weight as FontWeight,
            color: values.color?.trim() || undefined,
            background: values.background?.trim() || undefined,
          },
        ],
        panelId: Number(values.panelId) as PanelId,
        density: values.density as Density,
        fullPanel: values.fullPanel,
      });
      await showHUD(`Update sent ✓ (${res.messageId})`);
      pop();
    } catch (err) {
      const isAuth = err instanceof ApiError && (err.status === 401 || err.status === 403);
      await showToast(
        Toast.Style.Failure,
        isAuth ? "Authentication failed — please re-authenticate" : "Could not send update",
        (err as Error).message,
      );
      if (isAuth) {
        // Drop stale tokens so the next attempt re-runs the OAuth flow.
        await clearOAuthTokens();
      }
    }
  }

  const defaultBoard = boards.find((b) => b.isDefault);
  const boardEntries = boards.map((b) => ({ value: b.id, title: b.name || b.id }));

  return (
    <Form
      isLoading={boardsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Update" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="boardId"
        title="Board"
        isLoading={boardsLoading}
        defaultValue={defaultBoard?.id}
        info="Leave on the default board if you have one set; otherwise pick the target board."
      >
        <Form.Dropdown.Item value="" title="Default board" />
        {boardEntries.map((b) => (
          <Form.Dropdown.Item key={b.value} value={b.value} title={b.title} />
        ))}
      </Form.Dropdown>

      <Form.TextArea id="message" title="Message" placeholder="What should the display show?" />

      <Form.Separator />
      <Form.Dropdown id="panelId" title="Panel" defaultValue="1">
        {PANEL_OPTIONS.map((p) => (
          <Form.Dropdown.Item key={p.value} value={p.value} title={p.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="density" title="Spacing" defaultValue="standard">
        {DENSITY_OPTIONS.map((d) => (
          <Form.Dropdown.Item key={d.value} value={d.value} title={d.title} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="fullPanel" title="Full Panel" label="Fill the entire panel area" defaultValue={false} />

      <Form.Separator />
      <Form.Dropdown id="size" title="Text Size" defaultValue="medium">
        {SIZE_OPTIONS.map((s) => (
          <Form.Dropdown.Item key={s.value} value={s.value} title={s.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="weight" title="Weight" defaultValue="regular">
        {WEIGHT_OPTIONS.map((w) => (
          <Form.Dropdown.Item key={w.value} value={w.value} title={w.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="color" title="Text Color" placeholder="#FFFFFF" info="Hex color, e.g. #FFFFFF" />
      <Form.TextField
        id="background"
        title="Text Background"
        placeholder="#0A0A0A"
        info="Hex color behind the text, e.g. #0A0A0A"
      />
    </Form>
  );
}
