// @ts-nocheck
import React from "react";
import { Action, ActionPanel, List, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { piHoleAPI } from "./lib/api";

export default function EnableDisable() {
  const {
    data: status,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => {
    return await piHoleAPI.getStatus();
  }, []);

  const handleAction = async (action: "enable" | "disable", duration?: number) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: action === "enable" ? "Enabling Pi-hole..." : "Disabling Pi-hole...",
      });

      if (action === "enable") {
        await piHoleAPI.enable();
        await showToast({
          style: Toast.Style.Success,
          title: "✅ Pi-hole Enabled",
          message: "Query blocking is now active",
        });
      } else {
        await piHoleAPI.disable(duration);
        const message = duration
          ? `Blocking disabled for ${formatDuration(duration)}`
          : "Blocking disabled permanently";

        await showToast({
          style: Toast.Style.Success,
          title: "⏸️ Pi-hole Disabled",
          message,
        });
      }

      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "❌ Error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    return `${Math.floor(seconds / 3600)} hours`;
  };

  const getStatusTitle = (): string => {
    if (isLoading) return "Checking status...";
    if (!status) return "Unknown status";
    return status.enabled ? "Pi-hole is ACTIVE" : "Pi-hole is DISABLED";
  };

  const getStatusIcon = (): string => {
    if (isLoading) return Icon.QuestionMark;
    if (!status) return Icon.QuestionMark;
    return status.enabled ? Icon.CheckCircle : Icon.XMarkCircle;
  };

  const getStatusColor = () => {
    if (isLoading || !status) return undefined;
    return status.enabled ? "green" : "red";
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title="Estado Actual">
        <List.Item
          title={getStatusTitle()}
          icon={{ source: getStatusIcon(), tintColor: getStatusColor() }}
          subtitle={
            status?.enabled
              ? "Las consultas DNS están siendo filtradas y bloqueadas"
              : "Las consultas DNS pasan sin filtros"
          }
        />
      </List.Section>

      {status?.enabled ? (
        <List.Section title="Desactivar Pi-hole">
          <List.Item
            title="Desactivar por 5 minutos"
            subtitle="Desactivación temporal para pruebas rápidas"
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action title="Desactivar Por 5 Minutos" onAction={() => handleAction("disable", 300)} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Desactivar por 30 minutos"
            subtitle="Ideal para descargas o actualizaciones"
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action title="Desactivar Por 30 Minutos" onAction={() => handleAction("disable", 1800)} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Desactivar por 1 hora"
            subtitle="Para trabajos que requieren acceso completo"
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action title="Desactivar Por 1 Hora" onAction={() => handleAction("disable", 3600)} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Desactivar por 2 horas"
            subtitle="Para tareas largas o mantenimiento"
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action title="Desactivar Por 2 Horas" onAction={() => handleAction("disable", 7200)} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Desactivar permanentemente"
            subtitle="Requiere reactivación manual"
            icon={Icon.Stop}
            actions={
              <ActionPanel>
                <Action
                  title="Desactivar Permanentemente"
                  style={Action.Style.Destructive}
                  onAction={() => handleAction("disable")}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : (
        <List.Section title="Activar Pi-hole">
          <List.Item
            title="Activar Pi-hole"
            subtitle="Reanudar el bloqueo de consultas DNS"
            icon={Icon.Play}
            actions={
              <ActionPanel>
                <Action title="Activar Pi-hole" onAction={() => handleAction("enable")} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Utilidades">
        <List.Item
          title="Actualizar Estado"
          subtitle="Verificar el estado actual de Pi-hole"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action title="Actualizar" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
