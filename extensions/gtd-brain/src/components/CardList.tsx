import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { userMessage } from "../lib/backend";
import { sendEvent } from "../lib/events";
import {
  archiveCard,
  cardById,
  cardsInRole,
  columnByRole,
  contextsOf,
  daysSince,
  moveCard,
  moveToRoleRequest,
  nextActionOf,
  updateCard,
  type ApiCard,
  type ApiContext,
  type ListRole,
} from "../lib/gtd";
import { dashboardUrl, siteUrl, type DashboardView } from "../lib/links";
import { Authed } from "./Authed";
import { useBoard } from "./useBoard";

const ROLE_LABEL: Record<ListRole, string> = {
  inbox: "Inbox",
  next: "Next Actions",
  projects: "Projects",
  waiting: "Waiting For",
  someday: "Someday/Maybe",
};

const ROLE_VIEW: Record<ListRole, DashboardView> = {
  inbox: "inbox",
  next: "execution",
  projects: "board",
  waiting: "board",
  someday: "board",
};

const EMPTY: Record<ListRole, { title: string; description: string }> = {
  inbox: { title: "Inbox zero", description: "Nothing to clarify. Capture something with ⌘ Space → Capture to Inbox." },
  next: { title: "No next actions", description: "Clarify your Inbox to decide the very next step." },
  projects: { title: "No projects", description: "Any outcome that needs more than one step belongs here." },
  waiting: {
    title: "Nothing delegated",
    description: "Cards you hand to someone else wait here, with who and since when.",
  },
  someday: { title: "Nothing incubating", description: "Park ideas here and activate them at your weekly review." },
};

// One command per list; this is the list body they share. Every mutation refetches the board
// so what you see is what the dashboard, the phone apps and the assistants see.
export function CardListCommand({ role }: { role: ListRole }) {
  return <Authed>{(_session, signOut) => <CardList role={role} signOut={signOut} />}</Authed>;
}

function CardList({ role, signOut }: { role: ListRole; signOut: () => Promise<void> }) {
  const { data: board, isLoading, error, revalidate } = useBoard(signOut);
  const [contextFilter, setContextFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);

  const contexts = board ? contextsOf(board) : new Map<string, ApiContext>();
  const cards = board ? cardsInRole(board, role) : [];
  const shown =
    role === "next" && contextFilter !== "all" ? cards.filter((c) => (c.context ?? "none") === contextFilter) : cards;

  // The event is sent only once the request succeeded, so a failed change never reads as one.
  const run = async (label: string, fn: () => Promise<unknown>, event: [string, Record<string, unknown>]) => {
    setBusy(true);
    try {
      await fn();
      void sendEvent(event[0], event[1]);
      await showToast({ style: Toast.Style.Success, title: label });
      await revalidate();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Could not ${label.toLowerCase()}`,
        message: userMessage(e),
      });
    } finally {
      setBusy(false);
    }
  };

  const move = (card: ApiCard, target: ListRole, context?: string | null) => {
    const column = board && columnByRole(board.columns, target);
    if (!column) {
      void showToast({ style: Toast.Style.Failure, title: `No ${ROLE_LABEL[target]} column on your board` });
      return;
    }
    void run(`Moved to ${ROLE_LABEL[target]}`, () => moveCard(card.id, moveToRoleRequest(target, column.id, context)), [
      "card_moved",
      { cardId: card.id, from: role, to: target, ...(context ? { context } : {}) },
    ]);
  };

  const archive = (card: ApiCard, label: string) => {
    void run(label, () => archiveCard(card.id), ["card_archived", { cardId: card.id, list: role }]);
  };

  const setContext = (card: ApiCard, context: string | null) => {
    void run(
      context ? `Context set to ${contexts.get(context)?.label ?? context}` : "Context cleared",
      () => updateCard(card.id, { context }),
      ["card_context_changed", { cardId: card.id, list: role, context }],
    );
  };

  const openDashboard = (cardId?: string) =>
    void sendEvent("dashboard_opened", { target: role, ...(cardId ? { cardId } : {}) });

  const contextMenu = (title: string, icon: Icon, onPick: (id: string | null) => void) => (
    <ActionPanel.Submenu title={title} icon={icon}>
      {[...contexts.values()].map((c) => (
        <Action
          key={c.id}
          title={c.label}
          icon={{ source: Icon.Circle, tintColor: c.color }}
          onAction={() => onPick(c.id)}
        />
      ))}
      <Action title="No Context" icon={Icon.CircleDisabled} onAction={() => onPick(null)} />
    </ActionPanel.Submenu>
  );

  const commonActions = (card: ApiCard) => (
    <>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          title="Open on Dashboard"
          url={dashboardUrl(ROLE_VIEW[role], card.id)}
          shortcut={Keyboard.Shortcut.Common.Open}
          onOpen={() => openDashboard(card.id)}
        />
        <Action.CopyToClipboard title="Copy Title" content={card.title} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => void revalidate()}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Sign out"
          icon={Icon.Logout}
          style={Action.Style.Destructive}
          onAction={() => {
            void sendEvent("logout");
            void signOut();
          }}
        />
      </ActionPanel.Section>
    </>
  );

  const roleActions = (card: ApiCard) => {
    switch (role) {
      case "inbox":
        return (
          <ActionPanel.Section title="Clarify">
            {contextMenu("Move to Next Actions", Icon.ArrowRight, (ctx) => move(card, "next", ctx))}
            <Action title="Make It a Project" icon={Icon.Layers} onAction={() => move(card, "projects")} />
            <Action title="Move to Waiting for" icon={Icon.Hourglass} onAction={() => move(card, "waiting")} />
            <Action title="Move to Someday/Maybe" icon={Icon.Cloud} onAction={() => move(card, "someday")} />
            <Action
              title="Archive"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => archive(card, "Archived")}
            />
          </ActionPanel.Section>
        );
      case "next":
        return (
          <ActionPanel.Section title="Do">
            <Action
              title="Mark Done"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => archive(card, "Done")}
            />
            {contextMenu("Change Context", Icon.Tag, (ctx) => setContext(card, ctx))}
            <Action title="Move to Someday/Maybe" icon={Icon.Cloud} onAction={() => move(card, "someday")} />
            <Action title="Move to Waiting for" icon={Icon.Hourglass} onAction={() => move(card, "waiting")} />
          </ActionPanel.Section>
        );
      case "projects":
        return (
          <ActionPanel.Section title="Project">
            <Action
              title="Mark Complete"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => archive(card, "Completed")}
            />
            <Action title="Move to Someday/Maybe" icon={Icon.Cloud} onAction={() => move(card, "someday")} />
          </ActionPanel.Section>
        );
      case "waiting":
        return (
          <ActionPanel.Section title="Follow up">
            <Action
              title="Mark Received"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => archive(card, "Received")}
            />
            {contextMenu("Turn Into Next Action", Icon.ArrowRight, (ctx) => move(card, "next", ctx))}
          </ActionPanel.Section>
        );
      case "someday":
        return (
          <ActionPanel.Section title="Review">
            {contextMenu("Activate as Next Action", Icon.ArrowRight, (ctx) => move(card, "next", ctx))}
            <Action title="Activate as Project" icon={Icon.Layers} onAction={() => move(card, "projects")} />
            <Action
              title="Let It Go"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => archive(card, "Archived")}
            />
          </ActionPanel.Section>
        );
    }
  };

  const accessories = (card: ApiCard): List.Item.Accessory[] => {
    const out: List.Item.Accessory[] = [];
    if (role === "next" || role === "waiting") {
      const ctx = card.context ? contexts.get(card.context) : undefined;
      if (ctx) out.push({ tag: { value: ctx.label, color: ctx.color } });
    }
    if (role === "next" && card.projectId) {
      const project = board && cardById(board, card.projectId);
      if (project) out.push({ icon: Icon.Layers, text: project.title, tooltip: "Project" });
    }
    if (role === "projects" && board) {
      const next = nextActionOf(board, card.id);
      out.push(
        next
          ? { icon: Icon.ArrowRight, text: next.title, tooltip: "Next action" }
          : { icon: Icon.ExclamationMark, text: "No next action", tooltip: "Every active project needs a next action" },
      );
    }
    if (role === "waiting") {
      if (card.who) out.push({ icon: Icon.Person, text: card.who });
      const days = daysSince(card.since);
      if (days !== undefined) out.push({ text: days === 0 ? "today" : `${days}d`, tooltip: `Since ${card.since}` });
      else if (card.since) out.push({ text: `since ${card.since}` });
    }
    return out;
  };

  const noColumn = board && !columnByRole(board.columns, role);

  return (
    <List
      isLoading={isLoading || busy}
      navigationTitle={ROLE_LABEL[role]}
      searchBarPlaceholder={`Search ${ROLE_LABEL[role]}…`}
      searchBarAccessory={
        role === "next" ? (
          <List.Dropdown tooltip="Context" value={contextFilter} onChange={setContextFilter}>
            <List.Dropdown.Item title="All contexts" value="all" />
            {[...contexts.values()].map((c) => (
              <List.Dropdown.Item
                key={c.id}
                title={c.label}
                value={c.id}
                icon={{ source: Icon.Circle, tintColor: c.color }}
              />
            ))}
            <List.Dropdown.Item title="No context" value="none" />
          </List.Dropdown>
        ) : undefined
      }
    >
      {error && !board ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not load your board"
          description={userMessage(error)}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} />
              <Action title="Sign out" icon={Icon.Logout} onAction={() => void signOut()} />
            </ActionPanel>
          }
        />
      ) : noColumn ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="Set up your board first"
          description="Open the GTD Brain web app once to create your board, then come back."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open GTD Brain" url={siteUrl("/")} onOpen={() => openDashboard()} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.EmptyView
            icon={Icon.CheckCircle}
            title={EMPTY[role].title}
            description={EMPTY[role].description}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open on Dashboard"
                  url={dashboardUrl(ROLE_VIEW[role])}
                  onOpen={() => openDashboard()}
                />
              </ActionPanel>
            }
          />
          <List.Section
            title={ROLE_LABEL[role]}
            subtitle={`${shown.length}${shown.length !== cards.length ? ` of ${cards.length}` : ""}`}
          >
            {shown.map((card) => (
              <List.Item
                key={card.id}
                title={card.title}
                subtitle={card.notes ? firstLine(card.notes) : undefined}
                icon={itemIcon(role, card)}
                accessories={accessories(card)}
                actions={
                  <ActionPanel>
                    {roleActions(card)}
                    {commonActions(card)}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function itemIcon(role: ListRole, card: ApiCard) {
  if (role === "projects" || card.kind === "project") return Icon.Layers;
  if (role === "waiting") return Icon.Hourglass;
  if (role === "someday") return Icon.Cloud;
  if (role === "next" || card.kind === "action") return Icon.Circle;
  return Icon.Tray;
}

function firstLine(notes: string): string {
  const line = notes.split("\n").find((l) => l.trim());
  return line ? line.trim() : "";
}
