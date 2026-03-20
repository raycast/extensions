import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildGenericManifest, getGenericBodyTemplate } from "./lib/k8s";
import {
  applyManifestToContext,
  dryRunManifestToContext,
  getApiResources,
  getKubeContexts,
  getResourceSchema,
  KubeApiResource,
} from "./lib/kubectl";
import {
  buildDefaultBodyState,
  getEditableRootFields,
  isShallowObject,
  isSimpleField,
  KubeFieldSchema,
  KubeResourceSchema,
  materializeFieldValue,
  summarizeValue,
  toEditableValue,
} from "./lib/schema";
import { fetchRemoteManifest } from "./lib/templates";
import { toYaml } from "./lib/yaml";

type ManifestSource = "cluster-resource" | "template-url";
type IntOrStringMode = "string" | "number";
type IntOrStringValue = { mode: IntOrStringMode; value: string };

interface InlineFieldDescriptor {
  field: KubeFieldSchema;
  path: string[];
  title: string;
}

interface ComplexFieldDescriptor {
  field: KubeFieldSchema;
  path: string[];
  title: string;
}

interface DeletedValueMarker {
  __raycastDeleted: true;
}

function getDescriptorId(descriptor: { path: string[] }): string {
  return descriptor.path.join(".");
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function getResourceId(resource: KubeApiResource): string {
  return `${resource.apiVersion}|${resource.kind}|${resource.name}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDeletedValueMarker(value: unknown): value is DeletedValueMarker {
  return (
    isObject(value) &&
    value.__raycastDeleted === true &&
    Object.keys(value).length === 1
  );
}

function createDeletedValueMarker(): DeletedValueMarker {
  return { __raycastDeleted: true };
}

function cloneValue<T>(value: T): T {
  if (value === undefined) {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function areEditableValuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((item, index) => areEditableValuesEqual(item, right[index]))
    );
  }

  if (isObject(left) && isObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) => key in right && areEditableValuesEqual(left[key], right[key]),
      )
    );
  }

  return false;
}

function getValueAtPath(root: unknown, path: string[]): unknown {
  let current = root;

  for (const segment of path) {
    if (!isObject(current) || !(segment in current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function pruneEmpty(value: unknown): unknown {
  if (isDeletedValueMarker(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (!isObject(value)) {
    return value;
  }

  const entries = Object.entries(value)
    .map(([key, child]) => [key, pruneEmpty(child)] as const)
    .filter(([, child]) => child !== undefined);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function setValueAtPath(
  root: Record<string, unknown>,
  path: string[],
  nextValue: unknown,
): Record<string, unknown> {
  const result = cloneValue(root) ?? {};
  let cursor: Record<string, unknown> = result;

  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    const existing = cursor[segment];
    if (!isObject(existing)) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  }

  const finalKey = path[path.length - 1];
  if (nextValue === undefined) {
    delete cursor[finalKey];
  } else {
    cursor[finalKey] = nextValue;
  }

  return (pruneEmpty(result) as Record<string, unknown>) ?? {};
}

function mergeEditableValue(base: unknown, overlay: unknown): unknown {
  if (isDeletedValueMarker(overlay)) {
    return undefined;
  }

  if (overlay === undefined) {
    return cloneValue(base);
  }

  if (Array.isArray(overlay)) {
    return cloneValue(overlay);
  }

  if (isObject(base) && isObject(overlay)) {
    const result: Record<string, unknown> = cloneValue(base) ?? {};

    for (const [key, value] of Object.entries(overlay)) {
      const merged = mergeEditableValue(result[key], value);
      if (merged === undefined) {
        delete result[key];
      } else {
        result[key] = merged;
      }
    }

    return result;
  }

  return cloneValue(overlay);
}

function mergeEditableObjects(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>,
): Record<string, unknown> {
  const merged = mergeEditableValue(base, overlay);
  return isObject(merged) ? merged : {};
}

function deriveEditableOverride(base: unknown, next: unknown): unknown {
  if (next === undefined) {
    return base === undefined ? undefined : createDeletedValueMarker();
  }

  if (Array.isArray(next)) {
    return areEditableValuesEqual(base, next) ? undefined : cloneValue(next);
  }

  if (isObject(next)) {
    const baseObject = isObject(base) ? base : {};
    const nextObject = next;
    const keys = new Set([
      ...Object.keys(baseObject),
      ...Object.keys(nextObject),
    ]);
    const result: Record<string, unknown> = {};

    for (const key of keys) {
      const childOverride = deriveEditableOverride(
        baseObject[key],
        nextObject[key],
      );
      if (childOverride !== undefined) {
        result[key] = childOverride;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  return areEditableValuesEqual(base, next) ? undefined : cloneValue(next);
}

function addInlineDescriptor(
  inlineFields: InlineFieldDescriptor[],
  field: KubeFieldSchema,
  path: string[],
  title: string,
) {
  inlineFields.push({ field, path, title });
}

function getRenderableFields(
  fields: KubeFieldSchema[],
  options?: { expandNestedObjectChildren?: boolean },
): {
  inlineFields: InlineFieldDescriptor[];
  complexFields: ComplexFieldDescriptor[];
} {
  const inlineFields: InlineFieldDescriptor[] = [];
  const complexFields: ComplexFieldDescriptor[] = [];
  const expandNestedObjectChildren =
    options?.expandNestedObjectChildren ?? false;

  for (const field of fields) {
    if (isSimpleField(field)) {
      addInlineDescriptor(inlineFields, field, [field.key], field.label);
      continue;
    }

    if (isShallowObject(field)) {
      for (const child of field.properties ?? []) {
        addInlineDescriptor(
          inlineFields,
          child,
          [field.key, child.key],
          `${field.label} ${child.label}`,
        );
      }
      continue;
    }

    if (
      expandNestedObjectChildren &&
      field.type === "object" &&
      (field.properties?.length ?? 0) > 0
    ) {
      let exposedChild = false;

      for (const child of field.properties ?? []) {
        if (isSimpleField(child)) {
          addInlineDescriptor(
            inlineFields,
            child,
            [field.key, child.key],
            `${field.label} ${child.label}`,
          );
          exposedChild = true;
          continue;
        }

        if (isShallowObject(child)) {
          for (const grandchild of child.properties ?? []) {
            addInlineDescriptor(
              inlineFields,
              grandchild,
              [field.key, child.key, grandchild.key],
              `${field.label} ${child.label} ${grandchild.label}`,
            );
          }
          exposedChild = true;
          continue;
        }

        if (child.type !== "unknown") {
          complexFields.push({
            field: child,
            path: [field.key, child.key],
            title: `${field.label} ${child.label}`,
          });
          exposedChild = true;
        }
      }

      if (!exposedChild) {
        complexFields.push({
          field,
          path: [field.key],
          title: field.label,
        });
      }
      continue;
    }

    if (field.type !== "unknown") {
      complexFields.push({
        field,
        path: [field.key],
        title: field.label,
      });
    }
  }

  return { inlineFields, complexFields };
}

function stripReservedBodyFields(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...value };
  delete result.apiVersion;
  delete result.kind;
  delete result.metadata;
  delete result.status;
  return result;
}

function normalizeEditableBodyValue(
  schema: KubeResourceSchema | undefined,
  value: unknown,
): Record<string, unknown> {
  if (!schema || value === undefined) {
    return {};
  }

  const raw = toEditableValue(schema.root, value);

  if (!isObject(raw)) {
    return {};
  }

  return stripReservedBodyFields(raw);
}

function collectManifestBody(
  schema: KubeResourceSchema,
  bodyState: Record<string, unknown>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  for (const field of getEditableRootFields(schema)) {
    const rawValue = bodyState[field.key];
    const materialized = materializeFieldValue(field, rawValue);
    if (materialized !== undefined) {
      body[field.key] = materialized;
      continue;
    }

    if (field.required) {
      throw new Error(`${field.label} is required`);
    }
  }

  return body;
}

function getComplexFieldWarnings(field: KubeFieldSchema): string[] {
  return [
    ...field.warnings,
    ...(field.properties ?? []).flatMap((child) =>
      getComplexFieldWarnings(child),
    ),
    ...(field.itemSchema ? getComplexFieldWarnings(field.itemSchema) : []),
    ...(field.additionalProperties
      ? getComplexFieldWarnings(field.additionalProperties)
      : []),
  ];
}

function SimpleFieldInput({
  descriptor,
  value,
  onChange,
}: {
  descriptor: InlineFieldDescriptor;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const field = descriptor.field;
  const infoParts = [
    field.required ? "Required" : undefined,
    field.description,
  ].filter(Boolean);
  const info = infoParts.join(" | ") || undefined;

  if (field.type === "boolean") {
    return (
      <Form.Dropdown
        id={descriptor.path.join(".")}
        key={descriptor.path.join(".")}
        title={descriptor.title}
        value={
          value === true
            ? "true"
            : value === false
              ? "false"
              : value === "true" || value === "false"
                ? String(value)
                : ""
        }
        onChange={(next) => onChange(next || undefined)}
        info={info}
      >
        <Form.Dropdown.Item value="" title="Not set" />
        <Form.Dropdown.Item value="true" title="True" />
        <Form.Dropdown.Item value="false" title="False" />
      </Form.Dropdown>
    );
  }

  if (field.enumValues && field.enumValues.length > 0) {
    return (
      <Form.Dropdown
        id={descriptor.path.join(".")}
        key={descriptor.path.join(".")}
        title={descriptor.title}
        value={typeof value === "string" ? value : ""}
        onChange={(next) => onChange(next || undefined)}
        info={info}
      >
        <Form.Dropdown.Item value="" title="Not set" />
        {field.enumValues.map((option) => (
          <Form.Dropdown.Item key={option} value={option} title={option} />
        ))}
      </Form.Dropdown>
    );
  }

  if (field.type === "int-or-string") {
    const current = isObject(value)
      ? (value as IntOrStringValue)
      : { mode: "string", value: "" };

    return (
      <>
        <Form.Dropdown
          id={`${descriptor.path.join(".")}-mode`}
          key={`${descriptor.path.join(".")}-mode`}
          title={`${descriptor.title} Mode`}
          value={current.mode}
          onChange={(next) =>
            onChange({
              mode: (next as IntOrStringMode) || "string",
              value: current.value ?? "",
            })
          }
          info={info}
        >
          <Form.Dropdown.Item value="string" title="String" />
          <Form.Dropdown.Item value="number" title="Number" />
        </Form.Dropdown>
        <Form.TextField
          id={`${descriptor.path.join(".")}-value`}
          key={`${descriptor.path.join(".")}-value`}
          title={descriptor.title}
          value={typeof current.value === "string" ? current.value : ""}
          onChange={(next) =>
            onChange({
              mode: current.mode ?? "string",
              value: next,
            })
          }
          info={info}
        />
      </>
    );
  }

  return (
    <Form.TextField
      id={descriptor.path.join(".")}
      key={descriptor.path.join(".")}
      title={descriptor.title}
      value={value === undefined ? "" : String(value)}
      onChange={(next) => onChange(next || undefined)}
      info={info}
    />
  );
}

function SimpleValueEditor({
  field,
  value,
  onSave,
  title,
}: {
  field: KubeFieldSchema;
  value: unknown;
  onSave: (value: unknown) => void;
  title: string;
}) {
  const { pop } = useNavigation();
  const [localValue, setLocalValue] = useState<unknown>(
    cloneValue(value) ??
      (field.type === "int-or-string"
        ? { mode: "string", value: "" }
        : undefined),
  );

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action
            title="Save"
            icon={Icon.Check}
            onAction={() => {
              onSave(localValue);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <SimpleFieldInput
        descriptor={{ field, path: [field.key], title }}
        value={localValue}
        onChange={setLocalValue}
      />
    </Form>
  );
}

function MapEntryEditor({
  field,
  entryKey,
  value,
  onSave,
}: {
  field: KubeFieldSchema;
  entryKey?: string;
  value: unknown;
  onSave: (nextKey: string, nextValue: unknown) => void;
}) {
  const { pop } = useNavigation();
  const [keyValue, setKeyValue] = useState(entryKey ?? "");
  const [localValue, setLocalValue] = useState<unknown>(
    cloneValue(value) ??
      (field.type === "int-or-string"
        ? { mode: "string", value: "" }
        : undefined),
  );

  return (
    <Form
      navigationTitle={entryKey ? `Edit ${entryKey}` : "Add Entry"}
      actions={
        <ActionPanel>
          <Action
            title="Save Entry"
            icon={Icon.Check}
            onAction={() => {
              const normalizedKey = keyValue.trim();
              if (!normalizedKey) {
                void showToast({
                  style: Toast.Style.Failure,
                  title: "Map key is required",
                });
                return;
              }

              onSave(normalizedKey, localValue);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="map-key"
        title="Key"
        value={keyValue}
        onChange={setKeyValue}
      />
      <SimpleFieldInput
        descriptor={{ field, path: ["value"], title: "Value" }}
        value={localValue}
        onChange={setLocalValue}
      />
    </Form>
  );
}

function UnsupportedFieldDetail({ field }: { field: KubeFieldSchema }) {
  const markdown = [
    `# ${field.label}`,
    "",
    "This field uses schema constructs that the current UI cannot edit directly.",
    "",
    ...(field.description ? [field.description, ""] : []),
    ...(getComplexFieldWarnings(field).length > 0
      ? [
          "## Warnings",
          ...getComplexFieldWarnings(field).map((warning) => `- ${warning}`),
        ]
      : []),
  ].join("\n");

  return <Detail markdown={markdown} />;
}

function getEditorTarget(
  field: KubeFieldSchema,
  value: unknown,
  onSave: (value: unknown) => void,
  title?: string,
) {
  if (isSimpleField(field)) {
    return (
      <SimpleValueEditor
        field={field}
        value={value}
        onSave={onSave}
        title={title ?? field.label}
      />
    );
  }

  if (field.type === "object") {
    return (
      <ObjectFieldEditor
        field={field}
        value={value}
        onSave={onSave}
        title={title ?? field.label}
      />
    );
  }

  if (field.type === "array") {
    return (
      <ArrayFieldEditor
        field={field}
        value={value}
        onSave={onSave}
        title={title ?? field.label}
      />
    );
  }

  if (field.type === "map") {
    return (
      <MapFieldEditor
        field={field}
        value={value}
        onSave={onSave}
        title={title ?? field.label}
      />
    );
  }

  return <UnsupportedFieldDetail field={field} />;
}

function ObjectFieldEditor({
  field,
  value,
  onSave,
  title,
}: {
  field: KubeFieldSchema;
  value: unknown;
  onSave: (value: unknown) => void;
  title: string;
}) {
  const { pop } = useNavigation();
  const [localValue, setLocalValue] = useState<Record<string, unknown>>(
    isObject(value) ? cloneValue(value) : {},
  );

  const childFields = field.properties ?? [];
  const { inlineFields, complexFields } = useMemo(
    () => getRenderableFields(childFields),
    [childFields],
  );
  const [selectedComplexFieldKey, setSelectedComplexFieldKey] = useState(
    complexFields[0] ? getDescriptorId(complexFields[0]) : "",
  );

  useEffect(() => {
    setSelectedComplexFieldKey((previous) => {
      if (
        previous &&
        complexFields.some((item) => getDescriptorId(item) === previous)
      ) {
        return previous;
      }

      return complexFields[0] ? getDescriptorId(complexFields[0]) : "";
    });
  }, [complexFields]);

  const selectedComplexField = complexFields.find(
    (item) => getDescriptorId(item) === selectedComplexFieldKey,
  );

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action
            title="Save"
            icon={Icon.Check}
            onAction={() => {
              onSave(localValue);
              pop();
            }}
          />
          {selectedComplexField ? (
            <Action.Push
              title={`Edit ${selectedComplexField.title}`}
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={getEditorTarget(
                selectedComplexField.field,
                getValueAtPath(localValue, selectedComplexField.path),
                (nextValue) =>
                  setLocalValue((previous) =>
                    setValueAtPath(
                      previous,
                      selectedComplexField.path,
                      nextValue,
                    ),
                  ),
                selectedComplexField.title,
              )}
            />
          ) : null}
        </ActionPanel>
      }
    >
      {field.description ? <Form.Description text={field.description} /> : null}
      {getComplexFieldWarnings(field).length > 0 ? (
        <Form.Description
          text={`Warnings: ${getComplexFieldWarnings(field).slice(0, 3).join(" | ")}`}
        />
      ) : null}

      {inlineFields.map((descriptor) => (
        <SimpleFieldInput
          key={descriptor.path.join(".")}
          descriptor={descriptor}
          value={getValueAtPath(localValue, descriptor.path)}
          onChange={(nextValue) =>
            setLocalValue((previous) =>
              setValueAtPath(previous, descriptor.path, nextValue),
            )
          }
        />
      ))}

      {complexFields.length > 0 ? (
        <>
          <Form.Dropdown
            id="complex-field"
            title="Complex Field"
            value={selectedComplexFieldKey}
            onChange={setSelectedComplexFieldKey}
            info="Use Cmd+E to edit the selected nested field"
          >
            {complexFields.map((complexField) => (
              <Form.Dropdown.Item
                key={getDescriptorId(complexField)}
                value={getDescriptorId(complexField)}
                title={`${complexField.title} (${summarizeValue(getValueAtPath(localValue, complexField.path))})`}
              />
            ))}
          </Form.Dropdown>
          {complexFields.map((complexField) => (
            <Form.Description
              key={`summary-${getDescriptorId(complexField)}`}
              text={`${complexField.title}: ${summarizeValue(getValueAtPath(localValue, complexField.path))}`}
            />
          ))}
        </>
      ) : null}
    </Form>
  );
}

function ArrayFieldEditor({
  field,
  value,
  onSave,
  title,
}: {
  field: KubeFieldSchema;
  value: unknown;
  onSave: (value: unknown) => void;
  title: string;
}) {
  const { pop } = useNavigation();
  const [items, setItems] = useState<unknown[]>(
    Array.isArray(value) ? cloneValue(value) : [],
  );
  const [selectedItemId, setSelectedItemId] = useState("0");
  const itemSchema = field.itemSchema;
  const selectedIndex =
    selectedItemId === "__empty__" ? -1 : Number.parseInt(selectedItemId, 10);
  const selectedValue =
    selectedIndex >= 0 && Number.isInteger(selectedIndex)
      ? items[selectedIndex]
      : undefined;

  const makeNewItem = () => {
    if (!itemSchema) {
      return undefined;
    }

    const defaultValue = buildDefaultBodyState(itemSchema);
    return toEditableValue(itemSchema, defaultValue);
  };

  const listItems =
    items.length > 0
      ? items.map((item, index) => ({
          id: String(index),
          title: `${title} ${index + 1}`,
          subtitle: summarizeValue(item),
        }))
      : [
          {
            id: "__empty__",
            title: "No items configured",
            subtitle: "Add an item to start editing this field",
          },
        ];

  return (
    <List
      navigationTitle={title}
      onSelectionChange={(next) => setSelectedItemId(next ?? "__empty__")}
    >
      {listItems.map((item) => (
        <List.Item
          key={item.id}
          id={item.id}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Item"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={
                  itemSchema ? (
                    getEditorTarget(
                      itemSchema,
                      makeNewItem(),
                      (nextValue) =>
                        setItems((previous) => [...previous, nextValue]),
                      `New ${title} Item`,
                    )
                  ) : (
                    <UnsupportedFieldDetail field={field} />
                  )
                }
              />
              {itemSchema && selectedIndex >= 0 ? (
                <Action.Push
                  title="Edit Item"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={getEditorTarget(
                    itemSchema,
                    selectedValue,
                    (nextValue) =>
                      setItems((previous) =>
                        previous.map((entry, index) =>
                          index === selectedIndex ? nextValue : entry,
                        ),
                      ),
                    `${title} ${selectedIndex + 1}`,
                  )}
                />
              ) : null}
              {selectedIndex >= 0 ? (
                <Action
                  title="Delete Item"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() =>
                    setItems((previous) =>
                      previous.filter((_, index) => index !== selectedIndex),
                    )
                  }
                />
              ) : null}
              <Action
                title="Save"
                icon={Icon.Check}
                onAction={() => {
                  onSave(items.length > 0 ? items : undefined);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function MapFieldEditor({
  field,
  value,
  onSave,
  title,
}: {
  field: KubeFieldSchema;
  value: unknown;
  onSave: (value: unknown) => void;
  title: string;
}) {
  const { pop } = useNavigation();
  const [entries, setEntries] = useState<Record<string, unknown>>(
    isObject(value) ? cloneValue(value) : {},
  );
  const [selectedEntryKey, setSelectedEntryKey] = useState(
    Object.keys(entries)[0] ?? "__empty__",
  );
  const valueSchema = field.additionalProperties;

  useEffect(() => {
    setSelectedEntryKey((previous) => {
      const keys = Object.keys(entries);
      if (previous !== "__empty__" && keys.includes(previous)) {
        return previous;
      }

      return keys[0] ?? "__empty__";
    });
  }, [entries]);

  const entryKeys = Object.keys(entries);
  const items =
    entryKeys.length > 0
      ? entryKeys.map((entryKey) => ({
          id: entryKey,
          title: entryKey,
          subtitle: summarizeValue(entries[entryKey]),
        }))
      : [
          {
            id: "__empty__",
            title: "No entries configured",
            subtitle: "Add a map entry to start editing this field",
          },
        ];

  return (
    <List
      navigationTitle={title}
      onSelectionChange={(next) => setSelectedEntryKey(next ?? "__empty__")}
    >
      {items.map((item) => (
        <List.Item
          key={item.id}
          id={item.id}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              {valueSchema && isSimpleField(valueSchema) ? (
                <Action.Push
                  title="Add Entry"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={
                    <MapEntryEditor
                      field={valueSchema}
                      value={undefined}
                      onSave={(nextKey, nextValue) =>
                        setEntries((previous) => ({
                          ...previous,
                          [nextKey]: nextValue,
                        }))
                      }
                    />
                  }
                />
              ) : (
                <Action
                  title="Add Empty Entry"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => {
                    const nextKey = `entry-${entryKeys.length + 1}`;
                    setEntries((previous) => ({ ...previous, [nextKey]: {} }));
                  }}
                />
              )}
              {valueSchema && selectedEntryKey !== "__empty__" ? (
                <Action.Push
                  title="Edit Entry"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={
                    isSimpleField(valueSchema) ? (
                      <MapEntryEditor
                        field={valueSchema}
                        entryKey={selectedEntryKey}
                        value={entries[selectedEntryKey]}
                        onSave={(nextKey, nextValue) =>
                          setEntries((previous) => {
                            const nextEntries = { ...previous };
                            delete nextEntries[selectedEntryKey];
                            nextEntries[nextKey] = nextValue;
                            return nextEntries;
                          })
                        }
                      />
                    ) : (
                      getEditorTarget(
                        valueSchema,
                        entries[selectedEntryKey],
                        (nextValue) =>
                          setEntries((previous) => ({
                            ...previous,
                            [selectedEntryKey]: nextValue,
                          })),
                        selectedEntryKey,
                      )
                    )
                  }
                />
              ) : null}
              {selectedEntryKey !== "__empty__" ? (
                <Action
                  title="Delete Entry"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() =>
                    setEntries((previous) => {
                      const nextEntries = { ...previous };
                      delete nextEntries[selectedEntryKey];
                      return nextEntries;
                    })
                  }
                />
              ) : null}
              <Action
                title="Save"
                icon={Icon.Check}
                onAction={() => {
                  onSave(Object.keys(entries).length > 0 ? entries : undefined);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ManifestResultDetail({
  kind,
  fileName,
  yaml,
  kubeContext,
  sourceUrl,
  sourceLabel,
  warnings,
}: {
  kind: string;
  fileName: string;
  yaml: string;
  kubeContext?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  warnings?: string[];
}) {
  const [isRunningKubectl, setIsRunningKubectl] = useState(false);

  const applyCommand = kubeContext
    ? `cat ${fileName} | kubectl --context ${shellEscape(kubeContext)} apply -f -`
    : `cat ${fileName} | kubectl apply -f -`;
  const dryRunCommand = kubeContext
    ? `cat ${fileName} | kubectl --context ${shellEscape(kubeContext)} apply --dry-run=server -f -`
    : `cat ${fileName} | kubectl apply --dry-run=server -f -`;

  const markdown = useMemo(
    () =>
      [
        `# ${kind} Manifest`,
        `Suggested filename: \`${fileName}\``,
        ...(sourceLabel ? [`Source: \`${sourceLabel}\``] : []),
        ...(sourceUrl ? [`Template URL: \`${sourceUrl}\``] : []),
        kubeContext
          ? `Target context: \`${kubeContext}\``
          : "Target context: `kubectl current-context`",
        ...(warnings && warnings.length > 0
          ? ["", "## Warnings", ...warnings.map((warning) => `- ${warning}`)]
          : []),
        "",
        "```yaml",
        yaml,
        "```",
      ].join("\n"),
    [fileName, kind, kubeContext, sourceLabel, sourceUrl, warnings, yaml],
  );

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title={
              kubeContext
                ? `Dry Run with Context (${kubeContext})`
                : "Dry Run with Kubectl"
            }
            icon={Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={async () => {
              if (isRunningKubectl) {
                return;
              }

              setIsRunningKubectl(true);
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Dry-running manifest...",
              });

              try {
                const result = await dryRunManifestToContext(yaml, kubeContext);
                const output = [result.stdout.trim(), result.stderr.trim()]
                  .filter(Boolean)
                  .join(" | ");
                toast.style = Toast.Style.Success;
                toast.title = "Dry run succeeded";
                if (output) {
                  toast.message = output.slice(0, 120);
                }
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "kubectl dry run failed";
                toast.message =
                  error instanceof Error ? error.message : "Unknown error";
              } finally {
                setIsRunningKubectl(false);
              }
            }}
          />
          <Action
            title={
              kubeContext
                ? `Apply with Context (${kubeContext})`
                : "Apply with Kubectl"
            }
            icon={Icon.Upload}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onAction={async () => {
              if (isRunningKubectl) {
                return;
              }

              setIsRunningKubectl(true);
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Applying manifest...",
              });

              try {
                const result = await applyManifestToContext(yaml, kubeContext);
                const output = [result.stdout.trim(), result.stderr.trim()]
                  .filter(Boolean)
                  .join(" | ");
                toast.style = Toast.Style.Success;
                toast.title = "Manifest applied";
                if (output) {
                  toast.message = output.slice(0, 120);
                }
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "kubectl apply failed";
                toast.message =
                  error instanceof Error ? error.message : "Unknown error";
              } finally {
                setIsRunningKubectl(false);
              }
            }}
          />
          <Action.CopyToClipboard
            title="Copy YAML"
            content={yaml}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Copy to Clipboard and Close"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={async () => {
              await Clipboard.copy(yaml);
              await closeMainWindow();
              await showHUD("Kubernetes YAML copied");
            }}
          />
          <Action.CopyToClipboard
            title="Copy Suggested Filename"
            content={fileName}
          />
          <Action.CopyToClipboard
            title="Copy Kubectl Apply Command"
            content={applyCommand}
            shortcut={{ modifiers: ["cmd"], key: "k" }}
          />
          <Action.CopyToClipboard
            title="Copy Kubectl Dry Run Command"
            content={dryRunCommand}
            shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [manifestSource, setManifestSource] =
    useState<ManifestSource>("cluster-resource");
  const [kubeContexts, setKubeContexts] = useState<string[]>([]);
  const [selectedKubeContext, setSelectedKubeContext] = useState("");
  const [kubeContextSource, setKubeContextSource] = useState<
    "kubectl" | "kubeconfig" | null
  >(null);
  const [kubeContextError, setKubeContextError] = useState<string>();
  const [isLoadingKubeContexts, setIsLoadingKubeContexts] = useState(true);
  const [clusterResources, setClusterResources] = useState<KubeApiResource[]>(
    [],
  );
  const [selectedClusterResourceId, setSelectedClusterResourceId] =
    useState("");
  const [clusterResourceError, setClusterResourceError] = useState<string>();
  const [isLoadingClusterResources, setIsLoadingClusterResources] =
    useState(true);
  const [resourceSchema, setResourceSchema] = useState<KubeResourceSchema>();
  const [schemaError, setSchemaError] = useState<string>();
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [userOverrides, setUserOverrides] = useState<Record<string, unknown>>(
    {},
  );
  const [selectedComplexFieldKey, setSelectedComplexFieldKey] = useState("");
  const [nameValue, setNameValue] = useState("");
  const [namespaceValue, setNamespaceValue] = useState("");
  const [labelsValue, setLabelsValue] = useState("");
  const [annotationsValue, setAnnotationsValue] = useState("");
  const [templateUrlValue, setTemplateUrlValue] = useState("");

  const loadKubeContexts = useCallback(async () => {
    setIsLoadingKubeContexts(true);
    setKubeContextError(undefined);

    try {
      const data = await getKubeContexts();
      setKubeContexts(data.contexts);
      setKubeContextSource(data.source);
      setSelectedKubeContext((previous) => {
        if (previous && data.contexts.includes(previous)) {
          return previous;
        }

        if (
          data.currentContext &&
          data.contexts.includes(data.currentContext)
        ) {
          return data.currentContext;
        }

        return data.contexts[0] ?? "";
      });
    } catch (error) {
      setKubeContexts([]);
      setKubeContextSource(null);
      setSelectedKubeContext("");
      setKubeContextError(
        error instanceof Error ? error.message : "Unable to load kube contexts",
      );
    } finally {
      setIsLoadingKubeContexts(false);
    }
  }, []);

  const loadClusterResources = useCallback(async (context?: string) => {
    setIsLoadingClusterResources(true);
    setClusterResourceError(undefined);

    try {
      const resources = await getApiResources(context);
      setClusterResources(resources);
      setSelectedClusterResourceId((previous) => {
        if (
          previous &&
          resources.some((resource) => getResourceId(resource) === previous)
        ) {
          return previous;
        }

        const preferred =
          resources.find((resource) => resource.kind === "Deployment") ??
          resources[0];
        return preferred ? getResourceId(preferred) : "";
      });
    } catch (error) {
      setClusterResources([]);
      setSelectedClusterResourceId("");
      setClusterResourceError(
        error instanceof Error
          ? error.message
          : "Unable to load cluster resources",
      );
    } finally {
      setIsLoadingClusterResources(false);
    }
  }, []);

  useEffect(() => {
    void loadKubeContexts();
  }, [loadKubeContexts]);

  useEffect(() => {
    void loadClusterResources(selectedKubeContext || undefined);
  }, [loadClusterResources, selectedKubeContext]);

  const selectedClusterResource = useMemo(
    () =>
      clusterResources.find(
        (resource) => getResourceId(resource) === selectedClusterResourceId,
      ),
    [clusterResources, selectedClusterResourceId],
  );

  useEffect(() => {
    if (!selectedClusterResource || manifestSource !== "cluster-resource") {
      setResourceSchema(undefined);
      setSchemaError(undefined);
      setUserOverrides({});
      return;
    }

    let active = true;
    setIsLoadingSchema(true);
    setSchemaError(undefined);

    void getResourceSchema(
      selectedClusterResource,
      selectedKubeContext || undefined,
    )
      .then((schema) => {
        if (!active) {
          return;
        }

        setResourceSchema(schema);
        setUserOverrides({});
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setResourceSchema(undefined);
        setUserOverrides({});
        setSchemaError(
          error instanceof Error ? error.message : "Unable to load schema",
        );
      })
      .finally(() => {
        if (active) {
          setIsLoadingSchema(false);
        }
      });

    return () => {
      active = false;
    };
  }, [manifestSource, selectedClusterResource, selectedKubeContext]);

  const editableFields = useMemo(
    () => (resourceSchema ? getEditableRootFields(resourceSchema) : []),
    [resourceSchema],
  );
  const { inlineFields, complexFields } = useMemo(
    () =>
      getRenderableFields(editableFields, {
        expandNestedObjectChildren: true,
      }),
    [editableFields],
  );
  const schemaDefaultBody = useMemo(
    () =>
      resourceSchema
        ? normalizeEditableBodyValue(
            resourceSchema,
            buildDefaultBodyState(resourceSchema.root),
          )
        : {},
    [resourceSchema],
  );
  const generatedDefaultBody = useMemo(() => {
    if (!resourceSchema || !selectedClusterResource) {
      return {};
    }

    const generatedName = nameValue.trim() || "example-app";
    return normalizeEditableBodyValue(
      resourceSchema,
      getGenericBodyTemplate(selectedClusterResource, generatedName),
    );
  }, [nameValue, resourceSchema, selectedClusterResource]);
  const baseDefaultBody = useMemo(
    () => mergeEditableObjects(schemaDefaultBody, generatedDefaultBody),
    [generatedDefaultBody, schemaDefaultBody],
  );
  const defaultBody = baseDefaultBody;
  const effectiveBody = useMemo(
    () => mergeEditableObjects(defaultBody, userOverrides),
    [defaultBody, userOverrides],
  );

  const updateOverrideAtPath = useCallback(
    (path: string[], nextValue: unknown) => {
      const baseValue = getValueAtPath(defaultBody, path);
      const nextOverride = deriveEditableOverride(baseValue, nextValue);
      setUserOverrides((previous) =>
        setValueAtPath(previous, path, nextOverride),
      );
    },
    [defaultBody],
  );

  useEffect(() => {
    setSelectedComplexFieldKey((previous) => {
      if (
        previous &&
        complexFields.some((field) => getDescriptorId(field) === previous)
      ) {
        return previous;
      }

      return complexFields[0] ? getDescriptorId(complexFields[0]) : "";
    });
  }, [complexFields]);

  const selectedComplexField = complexFields.find(
    (field) => getDescriptorId(field) === selectedComplexFieldKey,
  );

  async function handleGenerate() {
    try {
      const kubeContext = selectedKubeContext.trim() || undefined;

      if (manifestSource === "template-url") {
        const templateManifest = await fetchRemoteManifest(templateUrlValue);
        await push(
          <ManifestResultDetail
            kind={templateManifest.kind}
            fileName={templateManifest.fileName}
            yaml={templateManifest.yaml}
            kubeContext={kubeContext}
            sourceLabel="Remote template"
            sourceUrl={templateManifest.sourceUrl}
          />,
        );
        return;
      }

      if (!selectedClusterResource || !resourceSchema) {
        throw new Error(
          "Choose a resource kind and wait for its schema to load",
        );
      }

      const bodyValues = collectManifestBody(resourceSchema, effectiveBody);
      const result = buildGenericManifest({
        resource: selectedClusterResource,
        name: nameValue,
        namespace: namespaceValue,
        labels: labelsValue,
        annotations: annotationsValue,
        bodyValues,
      });

      await push(
        <ManifestResultDetail
          kind={result.kind}
          fileName={result.fileName}
          yaml={toYaml(result.manifest)}
          kubeContext={kubeContext}
          sourceLabel={`${selectedClusterResource.kind} (${selectedClusterResource.apiVersion}) schema form`}
          warnings={resourceSchema.warnings}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title:
          manifestSource === "template-url"
            ? "Failed to fetch template"
            : "Failed to generate manifest",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle="Create Kubernetes YAML"
      actions={
        <ActionPanel>
          <Action
            title="Generate YAML"
            icon={Icon.Document}
            onAction={() => void handleGenerate()}
          />
          <Action
            title="Refresh Cluster Data"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              void loadKubeContexts();
              void loadClusterResources(selectedKubeContext || undefined);
            }}
          />
          {manifestSource === "cluster-resource" && selectedComplexField ? (
            <Action.Push
              title={`Edit ${selectedComplexField.title}`}
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={getEditorTarget(
                selectedComplexField.field,
                getValueAtPath(effectiveBody, selectedComplexField.path),
                (nextValue) =>
                  updateOverrideAtPath(selectedComplexField.path, nextValue),
                selectedComplexField.title,
              )}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Description text="Generate YAML from live cluster-discovered resource schemas or a remote template URL." />

      <Form.Dropdown
        id="manifestSource"
        title="Manifest Source"
        value={manifestSource}
        onChange={(value) => setManifestSource(value as ManifestSource)}
      >
        <Form.Dropdown.Item value="cluster-resource" title="Cluster Resource" />
        <Form.Dropdown.Item value="template-url" title="Template URL" />
      </Form.Dropdown>

      <Form.Dropdown
        id="kubeContext"
        title="Kube Context"
        value={selectedKubeContext}
        onChange={setSelectedKubeContext}
        isLoading={isLoadingKubeContexts}
        info={
          kubeContextSource
            ? `Loaded from ${kubeContextSource === "kubectl" ? "kubectl config" : "~/.kube/config (or KUBECONFIG)"}`
            : "Used for discovery, dry run, and apply"
        }
      >
        {kubeContexts.length > 0 ? (
          kubeContexts.map((context) => (
            <Form.Dropdown.Item key={context} value={context} title={context} />
          ))
        ) : (
          <Form.Dropdown.Item value="" title="Use kubectl default context" />
        )}
      </Form.Dropdown>
      {kubeContextError ? (
        <Form.Description text={`Context load warning: ${kubeContextError}`} />
      ) : null}

      {manifestSource === "cluster-resource" ? (
        <>
          <Form.Dropdown
            id="clusterResourceId"
            title="Cluster Resource Kind"
            value={selectedClusterResourceId}
            onChange={setSelectedClusterResourceId}
            isLoading={isLoadingClusterResources}
            info="Live list from kubectl api-resources --verbs=create for the selected context"
          >
            {clusterResources.length > 0 ? (
              clusterResources.map((resource) => (
                <Form.Dropdown.Item
                  key={getResourceId(resource)}
                  value={getResourceId(resource)}
                  title={`${resource.kind} (${resource.apiVersion})`}
                />
              ))
            ) : (
              <Form.Dropdown.Item
                value=""
                title="No create-capable resources found"
              />
            )}
          </Form.Dropdown>
          {clusterResourceError ? (
            <Form.Description
              text={`Resource discovery warning: ${clusterResourceError}`}
            />
          ) : null}
          {selectedClusterResource ? (
            <Form.Description
              text={`Generating for ${selectedClusterResource.kind} (${selectedClusterResource.apiVersion}) using resource name "${selectedClusterResource.name}"${selectedClusterResource.shortNames.length > 0 ? `, shortnames: ${selectedClusterResource.shortNames.join(", ")}` : ""}.`}
            />
          ) : null}
          {schemaError ? (
            <Form.Description text={`Schema warning: ${schemaError}`} />
          ) : null}
          {isLoadingSchema ? (
            <Form.Description text="Loading resource schema..." />
          ) : null}
          {resourceSchema && resourceSchema.warnings.length > 0 ? (
            <Form.Description
              text={`Schema warnings: ${resourceSchema.warnings.slice(0, 3).join(" | ")}`}
            />
          ) : null}
        </>
      ) : (
        <Form.TextField
          id="templateUrl"
          title="Template URL"
          placeholder="https://raw.githubusercontent.com/org/repo/main/k8s/deployment.yaml"
          value={templateUrlValue}
          onChange={setTemplateUrlValue}
          info="Fetches YAML over HTTP(S) at submit time"
        />
      )}

      {manifestSource === "cluster-resource" ? (
        <>
          <Form.TextField
            id="name"
            title="Name"
            placeholder="web-api"
            value={nameValue}
            onChange={setNameValue}
            info="Used as metadata.name"
          />
          <Form.TextField
            id="namespace"
            title="Namespace"
            placeholder="default"
            value={namespaceValue}
            onChange={setNamespaceValue}
            info={
              selectedClusterResource && !selectedClusterResource.namespaced
                ? "Ignored for cluster-scoped resources"
                : "Used when the resource is namespaced"
            }
          />
          <Form.TextArea
            id="labels"
            title="Labels"
            placeholder="team=platform,tier=backend"
            value={labelsValue}
            onChange={setLabelsValue}
          />
          <Form.TextArea
            id="annotations"
            title="Annotations"
            placeholder="owner=platform,environment=dev"
            value={annotationsValue}
            onChange={setAnnotationsValue}
          />

          {inlineFields.map((descriptor) => (
            <SimpleFieldInput
              key={descriptor.path.join(".")}
              descriptor={descriptor}
              value={getValueAtPath(effectiveBody, descriptor.path)}
              onChange={(nextValue) =>
                updateOverrideAtPath(descriptor.path, nextValue)
              }
            />
          ))}

          {complexFields.length > 0 ? (
            <>
              <Form.Dropdown
                id="complexField"
                title="Complex Field"
                value={selectedComplexFieldKey}
                onChange={setSelectedComplexFieldKey}
                info="Select a nested field and use Cmd+E to edit it"
              >
                {complexFields.map((field) => (
                  <Form.Dropdown.Item
                    key={getDescriptorId(field)}
                    value={getDescriptorId(field)}
                    title={`${field.title} (${summarizeValue(getValueAtPath(effectiveBody, field.path))})`}
                  />
                ))}
              </Form.Dropdown>
              {complexFields.map((field) => (
                <Form.Description
                  key={`summary-${getDescriptorId(field)}`}
                  text={`${field.title}: ${summarizeValue(getValueAtPath(effectiveBody, field.path))}`}
                />
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </Form>
  );
}
