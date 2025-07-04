// @ts-nocheck
import React, { useState } from "react";
import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { piHoleAPI } from "./lib/api";

interface TopClient {
  ip: string;
  name: string;
  count: number;
}

export default function TopDomains() {
  const [viewMode, setViewMode] = useState<"domains" | "clients">("domains");

  const {
    data: topDomains,
    isLoading: isDomainsLoading,
    revalidate: revalidateDomains,
  } = useCachedPromise(
    async () => {
      return await piHoleAPI.getTopDomains(25);
    },
    [],
    {
      initialData: { allowed: [], blocked: [] },
    }
  );

  const {
    data: topClients,
    isLoading: isClientsLoading,
    revalidate: revalidateClients,
  } = useCachedPromise(
    async () => {
      return await piHoleAPI.getTopClients(25);
    },
    [],
    {
      initialData: [],
    }
  );

  const isLoading = isDomainsLoading || isClientsLoading;

  const revalidateAll = () => {
    revalidateDomains();
    revalidateClients();
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const clientsArray = Array.isArray(topClients)
    ? topClients
        .map((client: TopClient) => ({
          client: client.name || client.ip,
          ip: client.ip,
          count: client.count,
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  if (viewMode === "clients") {
    return (
      <List
        isLoading={isLoading}
        searchBarAccessory={
          <List.Dropdown
            tooltip="Seleccionar Vista"
            value={viewMode}
            onChange={(value) => setViewMode(value as "domains" | "clients")}
          >
            <List.Dropdown.Item title="Dominios" value="domains" />
            <List.Dropdown.Item title="Clientes" value="clients" />
          </List.Dropdown>
        }
      >
        <List.Section title={`Top Clientes (${clientsArray.length})`}>
          {clientsArray.map((item, index) => (
            <List.Item
              key={item.client}
              title={item.client}
              subtitle={`${item.count} consultas`}
              icon={{ source: Icon.ComputerChip, tintColor: Color.Blue }}
              accessories={[
                { text: `#${index + 1}`, icon: Icon.Trophy },
                { text: formatNumber(item.count), icon: Icon.BarChart },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Información">
                    <Action.CopyToClipboard
                      title="Copiar Ip Del Cliente"
                      content={item.client}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Utilidades">
                    <Action
                      title="Actualizar"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={revalidateAll}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>

        {clientsArray.length === 0 && !isLoading && (
          <List.EmptyView
            title="No hay Clientes"
            description="No se encontraron clientes con consultas registradas"
            actions={
              <ActionPanel>
                <Action title="Actualizar" icon={Icon.ArrowClockwise} onAction={revalidateAll} />
              </ActionPanel>
            }
          />
        )}
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Seleccionar Vista"
          value={viewMode}
          onChange={(value) => setViewMode(value as "domains" | "clients")}
        >
          <List.Dropdown.Item title="Dominios" value="domains" />
          <List.Dropdown.Item title="Clientes" value="clients" />
        </List.Dropdown>
      }
    >
      <List.Section title={`Dominios Permitidos (${topDomains?.allowed.length || 0})`}>
        {topDomains?.allowed.map((item, index) => (
          <List.Item
            key={`allowed-${item.domain}`}
            title={item.domain}
            subtitle={`${item.count} consultas`}
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            accessories={[
              { text: `#${index + 1}`, icon: Icon.Trophy },
              { text: formatNumber(item.count), icon: Icon.BarChart },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Gestión de Dominio">
                  <Action
                    title="Agregar a Lista Negra"
                    icon={Icon.Minus}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      try {
                        await piHoleAPI.addToBlacklist(item.domain);
                        revalidateAll();
                      } catch (error) {
                        console.error("Error agregando a blacklist:", error);
                      }
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Información">
                  <Action.CopyToClipboard
                    title="Copiar Dominio"
                    content={item.domain}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.OpenInBrowser
                    title="Abrir En Navegador"
                    url={`https://${item.domain}`}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Utilidades">
                  <Action
                    title="Actualizar"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidateAll}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title={`Dominios Bloqueados (${topDomains?.blocked.length || 0})`}>
        {topDomains?.blocked.map((item, index) => (
          <List.Item
            key={`blocked-${item.domain}`}
            title={item.domain}
            subtitle={`${item.count} intentos bloqueados`}
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            accessories={[
              { text: `#${index + 1}`, icon: Icon.Trophy },
              { text: formatNumber(item.count), icon: Icon.BarChart },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Gestión de Dominio">
                  <Action
                    title="Agregar a Lista Blanca"
                    icon={Icon.Plus}
                    onAction={async () => {
                      try {
                        await piHoleAPI.addToWhitelist(item.domain);
                        revalidateAll();
                      } catch (error) {
                        console.error("Error agregando a whitelist:", error);
                      }
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Información">
                  <Action.CopyToClipboard
                    title="Copiar Dominio"
                    content={item.domain}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.OpenInBrowser
                    title="Ver Dominio (puede Estar Bloqueado)"
                    url={`https://${item.domain}`}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Utilidades">
                  <Action
                    title="Actualizar"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidateAll}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {(topDomains?.allowed.length || 0) === 0 && (topDomains?.blocked.length || 0) === 0 && !isLoading && (
        <List.EmptyView
          title="No hay Datos"
          description="No se encontraron dominios en las estadísticas"
          actions={
            <ActionPanel>
              <Action title="Actualizar" icon={Icon.ArrowClockwise} onAction={revalidateAll} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
