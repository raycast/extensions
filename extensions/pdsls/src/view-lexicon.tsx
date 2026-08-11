import { ActionPanel, Action, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { isAtprotoDid } from "@atcute/identity";
import {
  CompositeDidDocumentResolver,
  PlcDidDocumentResolver,
  AtprotoWebDidDocumentResolver,
} from "@atcute/identity-resolver";
import { LexiconSchemaResolver } from "@atcute/lexicon-resolver";
import { NodeDnsLexiconAuthorityResolver } from "@atcute/lexicon-resolver-node";
import { isNsid } from "@atcute/lexicons/syntax";

const didDocumentResolver = new CompositeDidDocumentResolver({
  methods: {
    plc: new PlcDidDocumentResolver(),
    web: new AtprotoWebDidDocumentResolver(),
  },
});

const lexiconAuthorityResolver = new NodeDnsLexiconAuthorityResolver();

const schemaResolver = new LexiconSchemaResolver({
  didDocumentResolver,
});

interface LexiconSchema {
  lexicon: number;
  id: string;
  description?: string;
  defs: Record<string, LexiconDef>;
}

interface LexiconPermission {
  type: "permission";
  resource: "repo" | "rpc" | "blob" | "account" | "identity";
  collection?: string[];
  action?: string[];
  lxm?: string[];
  aud?: string;
  inheritAud?: boolean;
}

interface LexiconDef {
  type: string;
  description?: string;
  key?: string;
  record?: LexiconObject;
  parameters?: LexiconObject;
  input?: { encoding: string; schema?: LexiconObject };
  output?: { encoding: string; schema?: LexiconObject };
  errors?: Array<{ name: string; description?: string }>;
  properties?: Record<string, LexiconProperty>;
  required?: string[];
  nullable?: string[];
  items?: LexiconProperty;
  refs?: string[];
  closed?: boolean;
  enum?: string[];
  const?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  maxGraphemes?: number;
  minGraphemes?: number;
  knownValues?: string[];
  format?: string;
  accept?: string[];
  maxSize?: number;
  // Permission-set fields
  title?: string;
  "title:langs"?: Record<string, string>;
  detail?: string;
  "detail:langs"?: Record<string, string>;
  permissions?: LexiconPermission[];
}

interface LexiconObject {
  type: string;
  description?: string;
  ref?: string;
  refs?: string[];
  closed?: boolean;
  properties?: Record<string, LexiconProperty>;
  required?: string[];
  nullable?: string[];
}

interface LexiconProperty {
  type: string;
  description?: string;
  ref?: string;
  refs?: string[];
  closed?: boolean;
  format?: string;
  items?: LexiconProperty;
  minLength?: number;
  maxLength?: number;
  maxGraphemes?: number;
  minGraphemes?: number;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  const?: string | boolean | number;
  default?: unknown;
  knownValues?: string[];
  accept?: string[];
  maxSize?: number;
}

function formatType(prop: LexiconProperty): string {
  if (prop.ref) return `\`${prop.ref}\``;
  if (prop.refs) return "union";
  if (prop.format) return `\`${prop.type}:${prop.format}\``;
  return `\`${prop.type}\``;
}

function formatUnionRefs(refs: string[]): string {
  return refs.map((r) => `- \`${r}\``).join("\n") + "\n";
}

function formatConstraints(prop: LexiconProperty): string {
  const constraints: string[] = [];
  if (prop.minLength !== undefined) constraints.push(`minLength: ${prop.minLength}`);
  if (prop.maxLength !== undefined) constraints.push(`maxLength: ${prop.maxLength}`);
  if (prop.maxGraphemes !== undefined) constraints.push(`maxGraphemes: ${prop.maxGraphemes}`);
  if (prop.minGraphemes !== undefined) constraints.push(`minGraphemes: ${prop.minGraphemes}`);
  if (prop.minimum !== undefined) constraints.push(`min: ${prop.minimum}`);
  if (prop.maximum !== undefined) constraints.push(`max: ${prop.maximum}`);
  if (prop.maxSize !== undefined) constraints.push(`maxSize: ${prop.maxSize}`);
  if (prop.accept) constraints.push(`accept: [${prop.accept.join(", ")}]`);
  if (prop.enum) constraints.push(`enum: [${prop.enum.join(", ")}]`);
  if (prop.const !== undefined) constraints.push(`const: ${prop.const}`);
  if (prop.default !== undefined) constraints.push(`default: ${JSON.stringify(prop.default)}`);
  if (prop.knownValues) constraints.push(`knownValues: [${prop.knownValues.join(", ")}]`);
  if (prop.closed) constraints.push(`closed: true`);
  return constraints.length > 0 ? ` (${constraints.join(", ")})` : "";
}

function renderProperties(properties: Record<string, LexiconProperty>, required: string[] = []): string {
  let md = "";
  for (const [name, prop] of Object.entries(properties)) {
    const isRequired = required.includes(name);
    md += `**${name}** ${formatType(prop)}${formatConstraints(prop)}${isRequired ? " *required*" : ""}\n`;
    if (prop.refs) {
      md += formatUnionRefs(prop.refs);
    }
    if (prop.items) {
      md += `\nitems: ${formatType(prop.items)}${formatConstraints(prop.items)}\n`;
      if (prop.items.refs) {
        md += formatUnionRefs(prop.items.refs);
      }
    }
    if (prop.description) md += `> ${prop.description}\n`;
    md += "\n";
  }
  return md;
}

function renderPermission(permission: LexiconPermission, index: number): string {
  let md = `- **#${index + 1}** \`${permission.resource}\`\n`;
  if (permission.collection && permission.collection.length > 0) {
    md += `  - Collections:\n`;
    for (const col of permission.collection) {
      md += `    - \`${col}\`\n`;
    }
  }
  if (permission.action && permission.action.length > 0) {
    md += `  - Actions: ${permission.action.join(", ")}\n`;
  }
  if (permission.lxm && permission.lxm.length > 0) {
    md += `  - Lexicon Methods:\n`;
    for (const method of permission.lxm) {
      md += `    - \`${method}\`\n`;
    }
  }
  if (permission.aud) {
    md += `  - Audience: \`${permission.aud}\`\n`;
  }
  if (permission.inheritAud) {
    md += `  - Inherit Audience: true\n`;
  }
  return md;
}

function renderDef(name: string, def: LexiconDef): string {
  let md = `## ${name === "main" ? "Main Definition" : name} \`${def.type}\`\n\n`;

  if (def.description) md += `${def.description}\n\n`;

  if (def.key) md += `**Record Key:** \`${def.key}\`\n\n`;

  // Permission-set: Title and Detail
  if (def.type === "permission-set") {
    if (def.title) md += `**Title:** ${def.title}\n\n`;
    if (def["title:langs"]) {
      md += `**Localized Titles:**\n`;
      for (const [lang, text] of Object.entries(def["title:langs"])) {
        md += `- \`${lang}\`: ${text}\n`;
      }
      md += "\n";
    }
    if (def.detail) md += `**Detail:** ${def.detail}\n\n`;
    if (def["detail:langs"]) {
      md += `**Localized Details:**\n`;
      for (const [lang, text] of Object.entries(def["detail:langs"])) {
        md += `- \`${lang}\`: ${text}\n`;
      }
      md += "\n";
    }
  }

  // Permission-set: Permissions list
  if (def.permissions && def.permissions.length > 0) {
    const supportedPermissions = def.permissions.filter((p) => p.resource === "repo" || p.resource === "rpc");
    if (supportedPermissions.length > 0) {
      md += `### Permissions\n\n`;
      supportedPermissions.forEach((permission, index) => {
        md += renderPermission(permission, index);
      });
      md += "\n";
    }
  }

  // Record properties
  if (def.record?.properties && Object.keys(def.record.properties).length > 0) {
    md += `## Properties\n\n`;
    md += renderProperties(def.record.properties, def.record.required);
  }

  // Object properties
  if (def.properties && Object.keys(def.properties).length > 0) {
    md += `## Properties\n\n`;
    md += renderProperties(def.properties, def.required);
  }

  // Parameters (query/procedure)
  if (def.parameters?.properties && Object.keys(def.parameters.properties).length > 0) {
    md += `## Parameters\n\n`;
    md += renderProperties(def.parameters.properties, def.parameters.required);
  }

  // Input
  if (def.input) {
    md += `## Input\n\n`;
    md += `**Encoding:** \`${def.input.encoding}\`\n\n`;
    if (def.input.schema?.ref) md += `**Schema:** \`${def.input.schema.ref}\`\n\n`;
    if (def.input.schema?.refs) {
      md += `**Schema (union):**\n`;
      md += formatUnionRefs(def.input.schema.refs);
    }
    if (def.input.schema?.properties && Object.keys(def.input.schema.properties).length > 0) {
      md += renderProperties(def.input.schema.properties, def.input.schema.required);
    }
  }

  // Output
  if (def.output) {
    md += `## Output\n\n`;
    md += `**Encoding:** \`${def.output.encoding}\`\n\n`;
    if (def.output.schema?.ref) md += `**Schema:** \`${def.output.schema.ref}\`\n\n`;
    if (def.output.schema?.refs) {
      md += `**Schema (union):**\n`;
      md += formatUnionRefs(def.output.schema.refs);
    }
    if (def.output.schema?.properties && Object.keys(def.output.schema.properties).length > 0) {
      md += renderProperties(def.output.schema.properties, def.output.schema.required);
    }
  }

  // Errors
  if (def.errors && def.errors.length > 0) {
    md += `## Errors\n\n`;
    for (const error of def.errors) {
      md += `- **${error.name}**`;
      if (error.description) md += `: ${error.description}`;
      md += "\n";
    }
    md += "\n";
  }

  // Union refs
  if (def.refs) {
    md += `### Union Types\n\n`;
    md += formatUnionRefs(def.refs);
  }

  // Constraints for simple types
  const defConstraints: string[] = [];
  if (def.minLength !== undefined) defConstraints.push(`minLength: ${def.minLength}`);
  if (def.maxLength !== undefined) defConstraints.push(`maxLength: ${def.maxLength}`);
  if (def.maxGraphemes !== undefined) defConstraints.push(`maxGraphemes: ${def.maxGraphemes}`);
  if (def.minGraphemes !== undefined) defConstraints.push(`minGraphemes: ${def.minGraphemes}`);
  if (def.minimum !== undefined) defConstraints.push(`min: ${def.minimum}`);
  if (def.maximum !== undefined) defConstraints.push(`max: ${def.maximum}`);
  if (def.maxSize !== undefined) defConstraints.push(`maxSize: ${def.maxSize}`);
  if (def.accept) defConstraints.push(`accept: [${def.accept.join(", ")}]`);
  if (def.closed) defConstraints.push(`closed: true`);
  if (defConstraints.length > 0) md += `**Constraints:** ${defConstraints.join(", ")}\n\n`;

  // Enum/const/etc for simple types
  if (def.enum) md += `**Enum:** [${def.enum.join(", ")}]\n\n`;
  if (def.const) md += `**Const:** ${def.const}\n\n`;
  if (def.knownValues) md += `**Known Values:** [${def.knownValues.join(", ")}]\n\n`;

  // Items for array types
  if (def.items) {
    md += `### Items\n\n`;
    md += `${formatType(def.items)}${formatConstraints(def.items)}\n`;
    if (def.items.refs) {
      md += formatUnionRefs(def.items.refs);
    }
  }

  return md;
}

function renderSchema(schema: LexiconSchema): string {
  let md = `# ${schema.id}\n\n`;
  md += `**Lexicon Version:** ${schema.lexicon}\n\n`;
  if (schema.description) md += `${schema.description}\n\n`;
  md += "---\n\n";

  const entries = Object.entries(schema.defs);
  for (let i = 0; i < entries.length; i++) {
    const [name, def] = entries[i];
    md += renderDef(name, def);
    if (i < entries.length - 1) {
      md += "---\n\n";
    }
  }

  return md;
}

async function fetchLexicon(nsid: string): Promise<{ schema: LexiconSchema; authority: string }> {
  if (!isNsid(nsid)) throw new Error("Invalid NSID");

  const authority = await lexiconAuthorityResolver.resolve(nsid);
  if (!isAtprotoDid(authority)) throw new Error("Invalid authority DID");

  const result = await schemaResolver.resolve(authority, nsid);
  return { schema: result.schema as LexiconSchema, authority: authority };
}

export default function Command({ arguments: args }: { arguments: { nsid: string } }) {
  const { nsid } = args;

  const { data: lexicon, isLoading, error } = usePromise(fetchLexicon, [nsid]);

  if (error) {
    return <Detail markdown={`# Error\n\nFailed to load lexicon \`${nsid}\`:\n\n${error.message}`} />;
  }

  if (isLoading || !lexicon) {
    return <Detail isLoading markdown={`# Loading...\n\nResolving lexicon \`${nsid}\`...`} />;
  }

  const markdown = renderSchema(lexicon.schema);

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in PDSls"
            url={`https://pdsls.dev/at://${lexicon.authority}/com.atproto.lexicon.schema/${nsid}#schema`}
          />
          <Action.CopyToClipboard
            title="Copy Markdown"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.CopyToClipboard
            title="Copy JSON"
            content={JSON.stringify(lexicon.schema, null, 2)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
