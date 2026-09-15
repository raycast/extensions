import { showError } from "@chrismessina/raycast-kit";
import type { ReactNode } from "react";
import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard } from "@raycast/api";
import { deleteRecord } from "../api/endpoints";
import { satisfied } from "../api/operations";
import type { AttioRecord, Attribute } from "../api/types";
import { useSelf } from "../hooks/useSelf";
import { recordTitle } from "../lib/display";
import { referencesByObject, shortId } from "../lib/format";
import { openRecordInHomeCommand } from "../lib/open-record";
import OpenInAttio from "../open-in-attio";
import RecordEditForm from "./RecordEditForm";

/**
 * Complete sectioned action panel for a single record (spec round-9 §1) —
 * shared by browse rows (records.tsx) and the reverse-traversal record screen
 * (RecordScreen.tsx) so neither loses Edit/Delete/Copy/relations. Relations
 * are generalized off `referencesByObject`, not a per-slug attribute map.
 *
 * Takes `pushFallback` instead of importing RecordScreen directly: RecordScreen
 * renders RecordActions, so RecordActions importing RecordScreen back would be
 * a circular dependency (madge --circular). Callers already have RecordScreen
 * in scope (records.tsx imports it; RecordScreen.tsx *is* it), so passing the
 * push callback costs them nothing.
 */
export default function RecordActions(props: {
  record: AttioRecord;
  objectSlug: string;
  singularNoun: string;
  attributes: Attribute[] | undefined;
  titleFor: (id: string) => { title: string; url?: string } | undefined;
  onMutated: () => void;
  onDelete?: () => Promise<void>;
  pins?: { pinned: boolean; toggle: () => void };
  pushFallback: (objectSlug: string, recordId: string) => void;
  extraViewActions?: ReactNode;
  /** "New <Object>" action — last row of the primary section. */
  newAction?: ReactNode;
  /** Export submenu — untitled tail section, above Delete. */
  exportAction?: ReactNode;
}) {
  const {
    record,
    objectSlug,
    singularNoun,
    attributes,
    titleFor,
    onMutated,
    onDelete,
    pins,
    pushFallback,
    extraViewActions,
    newAction,
    exportAction,
  } = props;
  const self = useSelf();
  const canEdit = satisfied(self.granted, "record_permission:read-write");

  const refsByObject = referencesByObject(record.values);
  const peopleRefs = refsByObject.people ?? [];
  const companyRefs = refsByObject.companies ?? [];

  const isPeople = objectSlug === "people";
  let companyRef: (typeof companyRefs)[number] | undefined;
  if (isPeople) {
    // Canonical `company` attribute first, then fall back to any company ref (existing behavior).
    companyRef = (record.values.company || []).find(
      (v): v is Extract<typeof v, { attribute_type: "record-reference" }> =>
        v.attribute_type === "record-reference" && v.target_object === "companies",
    );
    if (!companyRef) companyRef = companyRefs[0];
  }

  async function openRelated(targetObjectSlug: string, recordId: string) {
    const opened = await openRecordInHomeCommand(targetObjectSlug, recordId);
    if (!opened) pushFallback(targetObjectSlug, recordId);
  }

  async function handleDelete() {
    const title = recordTitle(record, objectSlug);
    const ok = await confirmAlert({
      title: `Delete ${singularNoun}?`,
      message: title,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      if (onDelete) {
        await onDelete();
      } else {
        await deleteRecord(objectSlug, record.id.record_id);
        onMutated();
      }
    } catch (error) {
      await showError(error, { title: "Delete failed" });
    }
  }

  const emailValue = Object.values(record.values)
    .flat()
    .find((v): v is Extract<typeof v, { attribute_type: "email-address" }> => v.attribute_type === "email-address");
  const title = recordTitle(record, objectSlug);
  const hasResolvableTitle = title !== shortId(record.id.record_id);

  // Panel order per Chris's 2026-09-09 sort: Primary (open/pin/new), Edit
  // (edit + copies), View (relations + list controls), then an untitled tail
  // for Export and Delete — Delete always bottommost.
  return (
    <>
      <ActionPanel.Section>
        <OpenInAttio url={record.web_url} />
        {isPeople && companyRef && (
          <Action
            icon={Icon.Building}
            title="Open Company"
            onAction={() => openRelated("companies", companyRef!.target_record_id)}
          />
        )}
        {pins && (
          <Action
            icon={pins.pinned ? Icon.TackDisabled : Icon.Tack}
            title={pins.pinned ? "Unpin Record" : "Pin Record"}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "p" },
              Windows: { modifiers: ["ctrl", "shift"], key: "p" },
            }}
            onAction={pins.toggle}
          />
        )}
        {newAction}
      </ActionPanel.Section>
      <ActionPanel.Section title="Edit">
        {canEdit && attributes && (
          <Action.Push
            icon={Icon.Pencil}
            title={`Edit ${singularNoun}`}
            target={
              <RecordEditForm
                objectSlug={objectSlug}
                singularNoun={singularNoun}
                record={record}
                attributes={attributes}
                titleFor={titleFor}
                onSaved={onMutated}
              />
            }
            shortcut={Keyboard.Shortcut.Common.Edit}
          />
        )}
        {hasResolvableTitle && <Action.CopyToClipboard title="Copy Name" content={title} />}
        {emailValue && <Action.CopyToClipboard title="Copy Email Address" content={emailValue.email_address} />}
        <Action.CopyToClipboard
          title="Copy Record URL"
          content={record.web_url}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="View">
        {peopleRefs.length > 0 && (
          <ActionPanel.Submenu title="View Related People" icon={Icon.TwoPeople}>
            {peopleRefs.map((v) => (
              <Action
                key={v.target_record_id}
                icon={Icon.Person}
                title={titleFor(v.target_record_id)?.title ?? `Person · ${shortId(v.target_record_id)}`}
                onAction={() => openRelated("people", v.target_record_id)}
              />
            ))}
          </ActionPanel.Submenu>
        )}
        {objectSlug !== "companies" && companyRefs.length > 0 && (
          <ActionPanel.Submenu title="View Related Companies" icon={Icon.Building}>
            {companyRefs.map((v) => (
              <Action
                key={v.target_record_id}
                icon={Icon.Building}
                title={titleFor(v.target_record_id)?.title ?? `Company · ${shortId(v.target_record_id)}`}
                onAction={() => openRelated("companies", v.target_record_id)}
              />
            ))}
          </ActionPanel.Submenu>
        )}
        {extraViewActions}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {exportAction}
        {canEdit && (
          <Action
            icon={Icon.Trash}
            title={`Delete ${singularNoun}`}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={handleDelete}
          />
        )}
      </ActionPanel.Section>
    </>
  );
}
