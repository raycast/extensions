import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { maskToken, tokenKind, verifyToken, VerifyResult } from "../lib/github";
import { TokenEntry } from "../lib/store";

function formatExpiry(raw: string): { text: string; color: Color } {
  // GitHub manda "2026-12-01 00:00:00 UTC"
  const date = new Date(raw.replace(" UTC", "Z").replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return { text: raw, color: Color.SecondaryText };
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  const when = date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  if (days < 0) return { text: `${when} (expirado)`, color: Color.Red };
  const color = days <= 7 ? Color.Red : days <= 30 ? Color.Orange : Color.Green;
  return { text: `${when} (${days} dia${days === 1 ? "" : "s"})`, color };
}

export function VerifyDetail({ entry }: { entry: TokenEntry }) {
  const [result, setResult] = useState<VerifyResult>();

  useEffect(() => {
    let alive = true;
    verifyToken(entry.token).then((r) => alive && setResult(r));
    return () => {
      alive = false;
    };
  }, [entry.token]);

  let markdown = `# ${entry.name}\n\nConsultando o GitHub…`;
  if (result?.ok) {
    markdown = `# ✅ Token válido\n\n**${entry.name}** pertence a **@${result.login}**${result.name ? ` (${result.name})` : ""}.`;
  } else if (result) {
    markdown = `# ❌ Token recusado\n\n**${entry.name}** — ${result.message}${result.status ? `\n\nHTTP ${result.status}` : ""}`;
  }

  const kind = tokenKind(entry.token);

  return (
    <Detail
      isLoading={!result}
      navigationTitle={`Verificar ${entry.name}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Token" text={maskToken(entry.token)} />
          <Detail.Metadata.TagList title="Tipo">
            <Detail.Metadata.TagList.Item text={kind} />
          </Detail.Metadata.TagList>
          {result?.ok && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Conta" text={`@${result.login}`} icon={Icon.Person} />
              <Detail.Metadata.Label
                title="Escopos"
                text={result.scopes ?? (kind === "Fine-grained" ? "Definidos no GitHub (fine-grained)" : "—")}
              />
              {result.expiresAt ? (
                <Detail.Metadata.Label
                  title="Expira em"
                  text={{ value: formatExpiry(result.expiresAt).text, color: formatExpiry(result.expiresAt).color }}
                />
              ) : (
                <Detail.Metadata.Label title="Expira em" text="Sem data de expiração" />
              )}
              {result.rateRemaining && (
                <Detail.Metadata.Label
                  title="Requisições restantes"
                  text={`${result.rateRemaining} de ${result.rateLimit ?? "?"} nesta hora`}
                />
              )}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copiar Token" content={entry.token} concealed />
          <Action.OpenInBrowser title="Abrir Tokens no GitHub" url="https://github.com/settings/tokens" />
        </ActionPanel>
      }
    />
  );
}
