import { Clipboard, showToast, Toast } from "@raycast/api";

const API_BASE = "https://api.planningcenteronline.com";

interface TypeAnnotation {
  name?: string;
}

interface AttributeDoc {
  name: string;
  type_annotation?: TypeAnnotation | null;
  note?: string | null;
  description?: string | null;
}

interface URLParameterDoc {
  name: string;
  parameter: string;
  type?: string | null;
  value?: string | null;
  description?: string | null;
  example?: string | null;
  can_assign_on_create?: boolean;
  can_assign_on_update?: boolean;
}

interface EdgeScope {
  name: string;
  scope_help?: string | null;
}

interface EdgeDoc {
  name: string;
  details?: string | null;
  path: string;
  deprecated?: boolean;
  filters?: string[] | null;
  scopes?: EdgeScope[] | null;
}

interface RelationshipDoc {
  name: string;
  association?: string | null;
  graph_type?: string | null;
  note?: string | null;
}

interface PermissionsDoc {
  can_create?: boolean;
  can_update?: boolean;
  can_destroy?: boolean;
  read?: string | null;
  create?: string | null;
  update?: string | null;
  destroy?: string | null;
  create_assignable?: string[] | null;
  update_assignable?: string[] | null;
}

interface ActionDoc {
  name: string;
  path: string;
  description?: string | null;
  details?: string | null;
}

interface DocNode<A> {
  attributes: A;
}

interface VertexDoc {
  attributes: {
    name: string;
    description?: string | null;
    example?: string | null;
    path?: string | null;
    collection_only?: boolean;
    resource_only?: boolean;
    deprecated?: boolean;
  };
  relationships: {
    attributes?: { data: DocNode<AttributeDoc>[] };
    relationships?: { data: DocNode<RelationshipDoc>[] };
    permissions?: { data: DocNode<PermissionsDoc> };
    can_query?: { data: DocNode<URLParameterDoc>[] };
    can_include?: { data: DocNode<URLParameterDoc>[] };
    can_order?: { data: DocNode<URLParameterDoc>[] };
    outbound_edges?: { data: DocNode<EdgeDoc>[] };
    inbound_edges?: { data: DocNode<EdgeDoc>[] };
    actions?: { data: DocNode<ActionDoc>[] };
    per_page?: { data: DocNode<URLParameterDoc> };
    offset?: { data: DocNode<URLParameterDoc> };
  };
}

function cell(value: string | null | undefined): string {
  return (value || "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function table(headers: string[], rows: string[][]): string {
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ];
  return lines.join("\n");
}

function buildMarkdown(vertex: VertexDoc, appTitle: string, version: string): string {
  const { attributes: info, relationships: rels } = vertex;
  const sections: string[] = [];

  sections.push(`# ${info.name} (Planning Center ${appTitle} API, version ${version})`);

  if (info.description) sections.push(info.description.trim());

  const flags = [
    info.deprecated && "**Deprecated.**",
    info.collection_only && "Collection only (no single-resource endpoint).",
    info.resource_only && "Resource only (no collection endpoint).",
  ].filter(Boolean);
  if (flags.length) sections.push(flags.join(" "));

  if (info.path) sections.push(`Base endpoint: \`${info.path}\``);

  const perms = rels.permissions?.data?.attributes;
  if (info.path) {
    const resourcePath = `${info.path}/{id}`;
    const withNote = (verb: string, path: string, note?: string | null) =>
      `- ${verb}: \`${path}\`${note ? ` — ${cell(note)}` : ""}`;
    const endpoints = [
      !info.resource_only && withNote("Listing", `GET ${info.path}`, perms?.read),
      !info.collection_only && withNote("Reading", `GET ${resourcePath}`, perms?.read),
      perms?.can_create && withNote("Creating", `POST ${info.path}`, perms.create),
      perms?.can_update && withNote("Updating", `PATCH ${resourcePath}`, perms.update),
      perms?.can_destroy && withNote("Deleting", `DELETE ${resourcePath}`, perms.destroy),
    ].filter(Boolean) as string[];
    if (endpoints.length) {
      let endpointSection = `## Endpoints\n\n` + endpoints.join("\n");
      const assignable = (label: string, names?: string[] | null) =>
        names?.length ? `Assignable attributes on ${label}: ${names.map((n) => `\`${n}\``).join(", ")}.` : null;
      const assignableLines = [
        assignable("create", perms?.create_assignable),
        assignable("update", perms?.update_assignable),
      ].filter(Boolean) as string[];
      if (assignableLines.length) endpointSection += `\n\n` + assignableLines.join("\n\n");
      sections.push(endpointSection);
    }
  }

  const attrs = rels.attributes?.data ?? [];
  if (attrs.length) {
    sections.push(
      `## Attributes\n\n` +
        table(
          ["Name", "Type", "Description"],
          attrs.map(({ attributes: a }) => [
            `\`${a.name}\``,
            cell(a.type_annotation?.name),
            cell([a.description, a.note].filter(Boolean).join(" — ")),
          ]),
        ),
    );
  }

  const relationships = rels.relationships?.data ?? [];
  if (relationships.length) {
    sections.push(
      `## Relationships\n\n` +
        table(
          ["Name", "Association", "Type", "Note"],
          relationships.map(({ attributes: r }) => [
            `\`${r.name}\``,
            cell(r.association),
            cell(r.graph_type),
            cell(r.note),
          ]),
        ),
    );
  }

  const queries = rels.can_query?.data ?? [];
  if (queries.length) {
    sections.push(
      `## Query Parameters\n\n` +
        table(
          ["Parameter", "Type", "Description", "Example"],
          queries.map(({ attributes: q }) => [
            `\`${q.parameter}\``,
            cell(q.type),
            cell(q.description),
            q.example ? `\`${cell(q.example)}\`` : "",
          ]),
        ),
    );
  }

  const includes = rels.can_include?.data ?? [];
  if (includes.length) {
    sections.push(
      `## Includable Associations\n\n` +
        includes
          .map(({ attributes: i }) => {
            const assignable =
              i.can_assign_on_create && i.can_assign_on_update
                ? " (assignable on create and update)"
                : i.can_assign_on_create
                  ? " (assignable on create)"
                  : i.can_assign_on_update
                    ? " (assignable on update)"
                    : "";
            return `- \`?include=${i.value || i.name}\` — ${cell(i.description)}${assignable}`;
          })
          .join("\n"),
    );
  }

  const orders = rels.can_order?.data ?? [];
  if (orders.length) {
    sections.push(
      `## Ordering\n\nPass \`?order=\` with one of: ` +
        orders.map(({ attributes: o }) => `\`${o.value || o.name}\``).join(", ") +
        ". Prefix with `-` for descending.",
    );
  }

  const edgeLine = ({ attributes: e }: DocNode<EdgeDoc>): string => {
    let line = `- \`${e.name}\`: \`${e.path}\``;
    if (e.filters?.length) line += ` — filters: ${e.filters.map((f) => `\`${f}\``).join(", ")}`;
    const helps = (e.scopes ?? []).filter((s) => s.scope_help);
    for (const s of helps) line += `\n  - \`${s.name}\`: ${cell(s.scope_help)}`;
    return line;
  };

  const outbound = (rels.outbound_edges?.data ?? []).filter(({ attributes: e }) => !e.deprecated);
  if (outbound.length) {
    sections.push(`## Associations (Outbound Edges)\n\n` + outbound.map(edgeLine).join("\n"));
  }

  const inbound = (rels.inbound_edges?.data ?? []).filter(({ attributes: e }) => !e.deprecated);
  if (inbound.length) {
    sections.push(`## Accessible From (Inbound Edges)\n\n` + inbound.map(edgeLine).join("\n"));
  }

  const actions = rels.actions?.data ?? [];
  if (actions.length) {
    sections.push(
      `## Actions\n\n` +
        actions
          .map(
            ({ attributes: a }) =>
              `### ${a.name}\n\n\`POST ${a.path}\`\n\n${(a.details || a.description || "").trim()}`,
          )
          .join("\n\n"),
    );
  }

  const paginationParams = [rels.per_page?.data?.attributes, rels.offset?.data?.attributes].filter(
    (p): p is URLParameterDoc => Boolean(p?.description),
  );
  if (paginationParams.length) {
    sections.push(
      `Pagination: ` + paginationParams.map((p) => `\`${p.parameter}\` — ${cell(p.description)}`).join("; ") + ".",
    );
  }

  if (info.example) {
    let example = info.example;
    try {
      example = JSON.stringify(JSON.parse(info.example), null, 2);
    } catch {
      // keep the raw example if it isn't valid JSON
    }
    sections.push(`## Example Object\n\n\`\`\`json\n${example}\n\`\`\``);
  }

  return sections.join("\n\n") + "\n";
}

export async function copyDocsAsMarkdown(app: string, appTitle: string, version: string, vertex: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching docs…" });
  try {
    const response = await fetch(`${API_BASE}/${app}/v2/documentation/${version}/vertices/${vertex}`);
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    const json = (await response.json()) as { data: VertexDoc };
    await Clipboard.copy(buildMarkdown(json.data, appTitle, version));
    toast.style = Toast.Style.Success;
    toast.title = "Copied docs as Markdown";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't copy docs";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
