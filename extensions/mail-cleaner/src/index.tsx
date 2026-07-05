import { useState, useCallback } from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchRecentMessages, moveMessagesToTrash, MailMessage } from "./mail";

function keyOf(msg: MailMessage): string {
  return `${msg.account}::${msg.id}`;
}

function formatAge(ageSeconds: number): string {
  if (ageSeconds < 60) return "ahora";
  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export default function Command() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    data: messages,
    isLoading,
    revalidate,
  } = usePromise(fetchRecentMessages, [], {
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "No se pudieron leer los correos",
        message: error.message,
      });
    },
  });

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!messages) return;
    setSelected(new Set(messages.map(keyOf)));
  }, [messages]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const deleteSelected = useCallback(async () => {
    if (selected.size === 0 || !messages) return;

    const confirmed = await confirmAlert({
      title: `¿Mover ${selected.size} correo(s) a la papelera?`,
      primaryAction: {
        title: "Mover a la papelera",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const targets = messages
      .filter((m) => selected.has(keyOf(m)))
      .map((m) => ({ account: m.account, id: m.id }));

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Moviendo a la papelera...",
    });

    try {
      const result = await moveMessagesToTrash(targets);
      if (result.failedCount === 0) {
        toast.style = Toast.Style.Success;
        toast.title = `${result.successCount} correo(s) movidos a la papelera`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `${result.successCount} ok, ${result.failedCount} fallaron`;
      }
      clearSelection();
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error al mover a la papelera";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }, [selected, messages, revalidate, clearSelection]);

  const navigationTitle =
    selected.size > 0
      ? `${selected.size} seleccionado(s) de ${messages?.length ?? 0}`
      : `Correos recientes (${messages?.length ?? 0})`;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Buscar por asunto o remitente..."
    >
      {(messages ?? []).map((msg) => {
        const key = keyOf(msg);
        const isSelected = selected.has(key);
        return (
          <List.Item
            key={key}
            id={key}
            icon={{
              source: isSelected ? Icon.CheckCircle : Icon.Circle,
              tintColor: isSelected ? Color.Green : Color.SecondaryText,
            }}
            title={msg.subject || "(sin asunto)"}
            subtitle={msg.sender}
            keywords={[msg.sender, msg.subject]}
            accessories={[
              { text: formatAge(msg.ageSeconds) },
              { tag: { value: msg.account, color: Color.Blue } },
              ...(msg.read
                ? []
                : [{ icon: { source: Icon.Circle, tintColor: Color.Blue } }]),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={isSelected ? "Deseleccionar" : "Seleccionar"}
                    icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => toggle(key)}
                  />
                  <Action
                    title="Mover Seleccionados a La Papelera"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={deleteSelected}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Seleccionar Todos"
                    icon={Icon.CheckCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={selectAll}
                  />
                  <Action
                    title="Limpiar Selección"
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                    onAction={clearSelection}
                  />
                  <Action
                    title="Actualizar Lista"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
