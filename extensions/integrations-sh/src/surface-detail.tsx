import { Action, ActionPanel, Detail, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  discoverDomainStream,
  domainPageUrl,
  getSurface,
  IntegrationsHttpError,
  surfaceApiUrl,
  surfacePageUrl,
  type Credential,
  type Surface,
  type SurfaceDocument,
} from "./api";

type ViewState = "loading" | "missing" | "discovering" | "done" | "error";

export function SurfaceDetail({ domain }: { domain: string }) {
  const [state, setState] = useState<ViewState>("loading");
  const [doc, setDoc] = useState<SurfaceDocument | null>(null);
  const [progress, setProgress] = useState("");
  const [liveSurfaces, setLiveSurfaces] = useState<Surface[]>([]);
  const [liveCredentials, setLiveCredentials] = useState<Record<string, Credential>>({});
  const discoveryAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void loadExistingSurface();

    return () => {
      discoveryAbortRef.current?.abort();
    };
  }, [domain]);

  async function loadExistingSurface() {
    discoveryAbortRef.current?.abort();
    setState("loading");
    setDoc(null);

    try {
      const surface = await getSurface(domain);
      setDoc(surface);
      setState("done");
    } catch (err) {
      if (err instanceof IntegrationsHttpError && err.status === 404) {
        setState("missing");
        return;
      }

      setState("error");
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load integration surface",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function runDiscovery() {
    discoveryAbortRef.current?.abort();
    const controller = new AbortController();
    discoveryAbortRef.current = controller;
    const { signal } = controller;

    setState("discovering");
    setProgress("Starting discovery...");
    setLiveSurfaces([]);
    setLiveCredentials({});

    let completed = false;

    try {
      for await (const message of discoverDomainStream(domain, signal)) {
        switch (message.event) {
          case "progress":
            setProgress(message.data.message ?? "Working...");
            break;
          case "credential":
            if (message.data.id && message.data.credential) {
              setLiveCredentials((current) => ({
                ...current,
                [message.data.id as string]: message.data.credential as Credential,
              }));
            }
            break;
          case "surface":
            setLiveSurfaces((current) => [...current, message.data]);
            break;
          case "done":
            setDoc(message.data);
            setState("done");
            completed = true;
            break;
          case "error":
            throw new Error(message.data.message ?? "Discovery failed");
          case "message":
            break;
          default: {
            const exhaustive: never = message;
            return exhaustive;
          }
        }
      }
    } catch (err) {
      if (signal.aborted) {
        return;
      }

      completed = true;
      setState("error");
      await showToast({
        style: Toast.Style.Failure,
        title: "Discovery failed",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      if (!completed && !signal.aborted) {
        setState("error");
        await showToast({
          style: Toast.Style.Failure,
          title: "Discovery failed",
          message: "The discovery stream closed before completing.",
        });
      }
    }
  }

  const markdown = useMemo(() => {
    if (state === "missing") {
      return [
        `# ${domain}`,
        "",
        "No stored integration surface was found for this domain.",
        "",
        "Run discovery to map APIs, MCP servers, CLIs, and authentication details.",
      ].join("\n");
    }

    if (state === "discovering") {
      return [
        `# Discovering ${domain}`,
        "",
        progress || "Working...",
        "",
        liveSurfaces.length
          ? `## Surfaces found so far\n\n${liveSurfaces.map((surface) => `- **${surface.name}** · ${surface.type}`).join("\n")}`
          : "",
        Object.keys(liveCredentials).length
          ? `## Credentials found so far\n\n${Object.values(liveCredentials)
              .map((credential) => `- **${credential.label}** · ${credential.type}`)
              .join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (doc) {
      return renderSurfaceMarkdown(doc);
    }

    if (state === "error") {
      return `# ${domain}\n\nCould not load integration surface.`;
    }

    return `# ${domain}\n\nLoading...`;
  }, [doc, domain, liveCredentials, liveSurfaces, progress, state]);

  return (
    <Detail
      isLoading={state === "loading"}
      navigationTitle={domain}
      markdown={markdown}
      metadata={doc ? <SurfaceMetadata doc={doc} /> : undefined}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Domain Page" icon={Icon.Globe} url={domainPageUrl(domain)} />
          {(state === "missing" || state === "error") && (
            <Action
              title="Run Discovery"
              icon={Icon.MagnifyingGlass}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={runDiscovery}
            />
          )}
          {state === "done" && (
            <Action
              title="Regenerate Discovery"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={runDiscovery}
            />
          )}
          {state !== "loading" && state !== "discovering" && (
            <Action title="Reload Surface" icon={Icon.ArrowClockwise} onAction={loadExistingSurface} />
          )}
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Surface API URL"
              content={surfaceApiUrl(domain)}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            <Action.CopyToClipboard title="Copy Domain" content={domain} shortcut={Keyboard.Shortcut.Common.Pin} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SurfaceMetadata({ doc }: { doc: SurfaceDocument }) {
  const credentialCount = Object.keys(doc.credentials ?? {}).length;
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Domain" text={doc.domain} />
      <Detail.Metadata.TagList title="Surfaces">
        {doc.surfaces.map((surface) => (
          <Detail.Metadata.TagList.Item key={surface.slug} text={surface.type.toUpperCase()} />
        ))}
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Credentials" text={String(credentialCount)} />
      {doc.discoveredAt ? (
        <Detail.Metadata.Label title="Discovered" text={new Date(doc.discoveredAt).toLocaleString()} />
      ) : null}
      {typeof doc.usedLlm === "boolean" ? (
        <Detail.Metadata.Label title="LLM-Assisted" text={doc.usedLlm ? "Yes" : "No"} />
      ) : null}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link title="Domain Page" target={domainPageUrl(doc.domain)} text={doc.domain} />
    </Detail.Metadata>
  );
}

function renderSurfaceMarkdown(doc: SurfaceDocument): string {
  const credentials = doc.credentials ?? {};
  const sections = [
    `# ${doc.domain}`,
    doc.summary ? `> ${doc.summary}` : "",
    doc.description ?? "",
    `## Surfaces`,
    ...doc.surfaces.map((surface) => renderSurface(surface, doc.domain, credentials)),
  ];

  if (Object.keys(credentials).length > 0) {
    sections.push("## Credentials");
    for (const [id, credential] of Object.entries(credentials)) {
      sections.push(renderCredential(id, credential));
    }
  }

  return sections.filter(Boolean).join("\n\n");
}

function renderSurface(surface: Surface, domain: string, credentials: Record<string, Credential>): string {
  const lines = [`### ${surface.name}`, `- Type: \`${surface.type}\``, `- Auth: \`${surface.auth.status}\``];

  if (surface.url) lines.push(`- URL: ${surface.url}`);
  if (surface.spec) lines.push(`- Spec: ${surface.spec}`);
  if (surface.docs) lines.push(`- Docs: ${surface.docs}`);
  if (surface.command) lines.push(`- Command: \`${surface.command}\``);

  if (surface.packages?.length) {
    lines.push(
      `- Packages: ${surface.packages
        .map((pkg) => `\`${pkg.runtimeHint ? `${pkg.runtimeHint} ` : ""}${pkg.identifier}\``)
        .join(", ")}`,
    );
  }

  if (surface.transports?.length) {
    lines.push(`- Transports: ${surface.transports.map((t) => `\`${t}\``).join(", ")}`);
  }

  lines.push(`- Page: ${surfacePageUrl(domain, surface.slug)}`);

  if (surface.auth.status === "required") {
    const credentialIds = new Set<string>();
    for (const entry of surface.auth.entries) {
      for (const use of entry.use ?? []) {
        if (use.id) credentialIds.add(use.id);
      }
    }

    const labels = Array.from(credentialIds).map((id) => `\`${credentials[id]?.label ?? id}\``);
    if (labels.length) {
      lines.push(`- Credentials: ${labels.join(", ")}`);
    }
  }

  if (surface.notes) {
    lines.push("", surface.notes);
  }

  return lines.join("\n");
}

function renderCredential(id: string, credential: Credential): string {
  const lines = [`### ${credential.label}`, `- ID: \`${id}\``, `- Type: \`${credential.type}\``];

  if (credential.acquisition) {
    lines.push(`- Acquisition: \`${credential.acquisition}\``);
  }
  if (credential.generateUrl) {
    lines.push(`- Generate: ${credential.generateUrl}`);
  }

  lines.push("", credential.setup);

  return lines.join("\n");
}
