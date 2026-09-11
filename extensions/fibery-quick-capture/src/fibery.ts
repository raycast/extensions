export interface FiberyPreferences {
  workspace: string;
  apiToken: string;
}

interface FiberyErrorResult {
  name?: string;
  message?: string;
}

interface FiberyResponse<T> {
  success: boolean;
  result: T | FiberyErrorResult;
}

interface SchemaField {
  "fibery/name": string;
  "fibery/type": string;
  "fibery/deleted?"?: boolean;
  "fibery/meta"?: {
    "fibery/collection?"?: boolean;
    "fibery/default-value"?: unknown;
    "fibery/entity-component?"?: boolean;
    "fibery/readonly?"?: boolean;
    "fibery/required?"?: boolean;
    "fibery/name?"?: boolean;
    "ui/type"?: string;
  };
}

interface SchemaType {
  "fibery/name": string;
  "fibery/fields": SchemaField[];
  "fibery/deleted?"?: boolean;
  "fibery/meta"?: {
    "fibery/domain?"?: boolean;
    "fibery/enum?"?: boolean;
    "fibery/platform?"?: boolean;
    "fibery/primitive?"?: boolean;
  };
}

interface FiberySchema {
  "fibery/types": SchemaType[];
}

interface CreatedEntity {
  "fibery/id": string;
  "fibery/public-id"?: string;
  [field: string]: unknown;
}

export interface CaptureDatabase {
  name: string;
  fields: CaptureField[];
  taskNameField: string;
}

export type CaptureFieldKind =
  "text" | "integer" | "decimal" | "boolean" | "date" | "date-time" | "location" | "relation" | "relation-collection";

export interface CaptureField {
  name: string;
  type: string;
  kind: CaptureFieldKind;
  required: boolean;
  inputType?: string;
  relationType?: string;
  relationLabelField?: string;
}

export interface RelationOption {
  id: string;
  title: string;
}

export class FiberyApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "FiberyApiError";
  }
}

export function getWorkspaceUrl(workspace: string): string {
  const trimmed = workspace.trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new FiberyApiError("Enter a Fibery workspace name or URL.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;

  try {
    url = new URL(withProtocol);
  } catch {
    throw new FiberyApiError("The Fibery workspace URL is invalid.");
  }

  if (!url.hostname.includes(".")) {
    url = new URL(`https://${url.hostname}.fibery.io`);
  }

  if (url.protocol !== "https:") {
    throw new FiberyApiError("The Fibery workspace must use HTTPS.");
  }

  if (!url.hostname.toLocaleLowerCase().endsWith(".fibery.io")) {
    throw new FiberyApiError("The workspace must be a fibery.io address, such as acme.fibery.io.");
  }

  return url.origin;
}

function localName(qualifiedName: string): string {
  return qualifiedName.split("/").at(-1) ?? qualifiedName;
}

function titleFieldScore(field: SchemaField): number {
  const name = localName(field["fibery/name"]).toLocaleLowerCase();

  if (field["fibery/meta"]?.["fibery/name?"]) return 100;
  if (name === "name") return 90;
  if (name === "title") return 80;
  if (name.includes("name")) return 50;
  if (name.includes("title")) return 40;
  return 0;
}

const primitiveFieldKinds: Record<string, CaptureFieldKind | undefined> = {
  "fibery/text": "text",
  "fibery/emoji": "text",
  "fibery/int": "integer",
  "fibery/decimal": "decimal",
  "fibery/bool": "boolean",
  "fibery/date": "date",
  "fibery/date-time": "date-time",
  "fibery/location": "location",
};

function isDeletedSchemaItem(item: { "fibery/name": string; "fibery/deleted?"?: boolean }): boolean {
  return item["fibery/deleted?"] === true || /_deleted$/i.test(item["fibery/name"]);
}

function requiresInput(field: SchemaField): boolean {
  const defaultValue = field["fibery/meta"]?.["fibery/default-value"];
  return field["fibery/meta"]?.["fibery/required?"] === true && (defaultValue === undefined || defaultValue === null);
}

function relationLabelField(type: SchemaType): string | undefined {
  const fields = type["fibery/fields"].filter(
    (field) =>
      !isDeletedSchemaItem(field) &&
      field["fibery/type"] === "fibery/text" &&
      !field["fibery/meta"]?.["fibery/collection?"],
  );

  if (type["fibery/meta"]?.["fibery/enum?"]) {
    const enumName = fields.find((field) => field["fibery/name"] === "enum/name");
    if (enumName) return enumName["fibery/name"];
  }

  return fields.sort(
    (a, b) => titleFieldScore(b) - titleFieldScore(a) || a["fibery/name"].localeCompare(b["fibery/name"]),
  )[0]?.["fibery/name"];
}

export function captureDatabasesFromSchema(schema: FiberySchema): CaptureDatabase[] {
  const activeTypes = schema["fibery/types"].filter((type) => !isDeletedSchemaItem(type));
  const typesByName = new Map(activeTypes.map((type) => [type["fibery/name"], type]));

  return schema["fibery/types"]
    .filter(
      (type) =>
        !isDeletedSchemaItem(type) &&
        type["fibery/meta"]?.["fibery/domain?"] === true &&
        type["fibery/meta"]?.["fibery/platform?"] !== true &&
        type["fibery/meta"]?.["fibery/primitive?"] !== true,
    )
    .map<CaptureDatabase | undefined>((type) => {
      const writableFields = type["fibery/fields"].filter(
        (field) =>
          !isDeletedSchemaItem(field) &&
          field["fibery/meta"]?.["fibery/readonly?"] !== true &&
          field["fibery/meta"]?.["fibery/entity-component?"] !== true &&
          !field["fibery/name"].startsWith("fibery/"),
      );

      const fields = writableFields.flatMap<CaptureField>((field) => {
        const primitiveKind = primitiveFieldKinds[field["fibery/type"]];
        if (primitiveKind && field["fibery/meta"]?.["fibery/collection?"] !== true) {
          return [
            {
              name: field["fibery/name"],
              type: field["fibery/type"],
              kind: primitiveKind,
              required: requiresInput(field),
              inputType: field["fibery/meta"]?.["ui/type"],
            },
          ];
        }

        const relatedType = typesByName.get(field["fibery/type"]);
        const labelField = relatedType ? relationLabelField(relatedType) : undefined;
        if (!relatedType || !labelField) return [];

        return [
          {
            name: field["fibery/name"],
            type: field["fibery/type"],
            kind: field["fibery/meta"]?.["fibery/collection?"] === true ? "relation-collection" : "relation",
            required: requiresInput(field),
            relationType: relatedType["fibery/name"],
            relationLabelField: labelField,
          },
        ];
      });

      const titleFields = writableFields
        .filter(
          (field) =>
            field["fibery/type"] === "fibery/text" &&
            field["fibery/meta"]?.["fibery/entity-component?"] !== true &&
            !isDeletedSchemaItem(field),
        )
        .sort((a, b) => titleFieldScore(b) - titleFieldScore(a) || a["fibery/name"].localeCompare(b["fibery/name"]));
      const canonicalNameField = titleFields.find(
        (field) => localName(field["fibery/name"]).toLocaleLowerCase() === "name",
      );
      const supportedFieldNames = new Set(fields.map((field) => field.name));
      const hasUnsupportedRequiredField = writableFields.some(
        (field) => requiresInput(field) && !supportedFieldNames.has(field["fibery/name"]),
      );

      if (!canonicalNameField || hasUnsupportedRequiredField) return undefined;

      return {
        name: type["fibery/name"],
        fields,
        taskNameField: canonicalNameField["fibery/name"],
      };
    })
    .filter((database): database is CaptureDatabase => database !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export class FiberyClient {
  private readonly commandsUrl: string;

  constructor(private readonly preferences: FiberyPreferences) {
    this.commandsUrl = `${getWorkspaceUrl(preferences.workspace)}/api/commands`;
  }

  private async command<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    let response: Response;

    try {
      response = await fetch(this.commandsUrl, {
        method: "POST",
        headers: {
          Authorization: `Token ${this.preferences.apiToken.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args ? { command, args } : { command }),
      });
    } catch {
      throw new FiberyApiError("Could not connect to Fibery. Check the workspace URL and your internet connection.");
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new FiberyApiError("Fibery rejected the API token. Update it in extension preferences.", 401);
      }
      if (response.status === 429) {
        throw new FiberyApiError("Fibery is rate limiting requests. Try again in a moment.", 429);
      }

      const detail = await response.text();
      throw new FiberyApiError(detail || `Fibery returned HTTP ${response.status}.`, response.status);
    }

    const payload = (await response.json()) as FiberyResponse<T>;
    if (!payload.success) {
      const error = payload.result as FiberyErrorResult;
      throw new FiberyApiError(error.message || error.name || "Fibery could not complete the request.");
    }

    return payload.result as T;
  }

  async getCaptureDatabases(): Promise<CaptureDatabase[]> {
    const schema = await this.command<FiberySchema>("fibery.schema/query");
    return captureDatabasesFromSchema(schema);
  }

  async getRelationOptions(field: CaptureField): Promise<RelationOption[]> {
    if (!field.relationType || !field.relationLabelField) return [];

    const entities = await this.command<Record<string, unknown>[]>("fibery.entity/query", {
      query: {
        "q/from": field.relationType,
        "q/select": ["fibery/id", field.relationLabelField],
        "q/order-by": [[[field.relationLabelField], "q/asc"]],
        "q/limit": 100,
      },
    });

    return entities
      .map((entity) => ({
        id: String(entity["fibery/id"] ?? ""),
        title: String(entity[field.relationLabelField as string] ?? ""),
      }))
      .filter((option) => option.id && option.title);
  }

  async createTask(
    database: string,
    titleField: string,
    title: string,
    additionalFields: Record<string, unknown> = {},
  ): Promise<CreatedEntity> {
    return this.command<CreatedEntity>("fibery.entity/create", {
      type: database,
      entity: {
        [titleField]: title.trim(),
        ...additionalFields,
      },
    });
  }

  async addCollectionItems(
    database: string,
    field: string,
    entityId: string,
    relatedEntityIds: string[],
  ): Promise<void> {
    if (relatedEntityIds.length === 0) return;

    await this.command<string>("fibery.entity/add-collection-items", {
      type: database,
      field,
      entity: {
        "fibery/id": entityId,
      },
      items: relatedEntityIds.map((id) => ({ "fibery/id": id })),
    });
  }
}
