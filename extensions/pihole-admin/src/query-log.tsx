import React, { useState } from "react";
import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { piHoleAPI } from "./lib/api";

interface QueryLogEntry {
  timestamp: string;
  query_type: string;
  domain: string;
  client: string;
  status: string;
  reply_type: string;
  reply_time: number;
  dnssec: string;
}

export default function QueryLog() {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "blocked" | "allowed">("all");

  const {
    data: queryLog,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      return await piHoleAPI.getQueryLog();
    },
    [],
    {
      initialData: { queries: [], cursor: "" },
    }
  );

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "blocked":
        return { source: Icon.XMarkCircle, tintColor: Color.Red };
      case "allowed":
      case "ok":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "cached":
        return { source: Icon.CircleProgress, tintColor: Color.Blue };
      default:
        return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
    }
  };

  const getStatusText = (status: string): string => {
    switch (status.toLowerCase()) {
      case "blocked":
        return "🔴 BLOQUEADO";
      case "allowed":
      case "ok":
        return "🟢 PERMITIDO";
      case "cached":
        return "🔵 CACHÉ";
      default:
        return "❓ DESCONOCIDO";
    }
  };

  const getQueryTypeColor = (queryType: string) => {
    switch (queryType) {
      case "A":
        return Color.Green;
      case "AAAA":
        return Color.Blue;
      case "CNAME":
        return Color.Orange;
      case "PTR":
        return Color.Purple;
      case "MX":
        return Color.Yellow;
      case "TXT":
        return Color.SecondaryText;
      default:
        return Color.PrimaryText;
    }
  };

  const filterQueries = (queries: QueryLogEntry[]): QueryLogEntry[] => {
    let filtered = queries;

    // Filtrar por estado
    if (statusFilter !== "all") {
      filtered = filtered.filter((query) => {
        if (statusFilter === "blocked") {
          return query.status.toLowerCase() === "blocked";
        } else if (statusFilter === "allowed") {
          return query.status.toLowerCase() === "allowed" || query.status.toLowerCase() === "ok";
        }
        return true;
      });
    }

    // Filtrar por texto de búsqueda
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (query) =>
          query.domain.toLowerCase().includes(searchLower) ||
          query.client.toLowerCase().includes(searchLower) ||
          query.query_type.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const filteredQueries = filterQueries(queryLog?.queries || []);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Buscar por dominio, cliente o tipo..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filtrar por Estado"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as "all" | "blocked" | "allowed")}
        >
          <List.Dropdown.Item title="Todos" value="all" />
          <List.Dropdown.Item title="Solo Bloqueados" value="blocked" />
          <List.Dropdown.Item title="Solo Permitidos" value="allowed" />
        </List.Dropdown>
      }
    >
      <List.Section title={`Registro de Consultas (${filteredQueries.length} resultados)`}>
        {filteredQueries.map((query, index) => (
          <List.Item
            key={`${query.timestamp}-${index}`}
            title={query.domain}
            subtitle={`${query.client} • ${formatDate(query.timestamp)}`}
            icon={getStatusIcon(query.status)}
            accessories={[
              {
                text: query.query_type,
                icon: { source: Icon.Dot, tintColor: getQueryTypeColor(query.query_type) },
              },
              {
                text: `${query.reply_time}ms`,
                icon: Icon.Clock,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Información">
                  <Action.CopyToClipboard
                    title="Copiar Dominio"
                    content={query.domain}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copiar Cliente"
                    content={query.client}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Gestión de Dominios">
                  {query.status.toLowerCase() === "blocked" ? (
                    <Action
                      title="Agregar a Lista Blanca"
                      icon={Icon.Plus}
                      onAction={async () => {
                        try {
                          await piHoleAPI.addToWhitelist(query.domain);
                          revalidate();
                        } catch (error) {
                          console.error("Error agregando a whitelist:", error);
                        }
                      }}
                    />
                  ) : (
                    <Action
                      title="Agregar a Lista Negra"
                      icon={Icon.Minus}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        try {
                          await piHoleAPI.addToBlacklist(query.domain);
                          revalidate();
                        } catch (error) {
                          console.error("Error agregando a blacklist:", error);
                        }
                      }}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Utilidades">
                  <Action
                    title="Actualizar"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={`
# Consulta DNS Detallada

## Información General
- **Dominio**: ${query.domain}
- **Estado**: ${getStatusText(query.status)}
- **Cliente**: ${query.client}
- **Fecha y Hora**: ${formatDate(query.timestamp)}

## Detalles Técnicos
- **Tipo de Consulta**: ${query.query_type}
- **Tipo de Respuesta**: ${query.reply_type}
- **Tiempo de Respuesta**: ${query.reply_time}ms
- **DNSSEC**: ${query.dnssec || "No disponible"}

## Descripción del Estado
${
  query.status.toLowerCase() === "blocked"
    ? "Esta consulta fue **bloqueada** por Pi-hole debido a que el dominio está en una lista de bloqueo."
    : query.status.toLowerCase() === "cached"
      ? "Esta consulta fue respondida desde la **caché** de Pi-hole, lo que acelera la respuesta."
      : "Esta consulta fue **permitida** y reenviada al servidor DNS upstream."
}
                `}
              />
            }
          />
        ))}
      </List.Section>

      {filteredQueries.length === 0 && !isLoading && (
        <List.EmptyView
          title="Sin Resultados"
          description={
            searchText || statusFilter !== "all"
              ? "No se encontraron consultas que coincidan con los filtros aplicados"
              : "No hay consultas DNS registradas"
          }
          actions={
            <ActionPanel>
              <Action title="Actualizar" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action
                title="Limpiar Filtros"
                icon={Icon.Multiply}
                onAction={() => {
                  setSearchText("");
                  setStatusFilter("all");
                }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
