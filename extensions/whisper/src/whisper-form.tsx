import { Action, ActionPanel, Clipboard, Form, showHUD, showToast, Toast } from "@raycast/api";
import { Fragment, useState } from "react";
import { createSecret, formatDuration, parseDuration } from "./shared";

const DEFAULT_DURATION_SECONDS = 3600;

type Mode = "freeform" | "multipleValues";

interface Entry {
  id: string;
}

interface Section {
  id: string;
  entries: Entry[];
}

let idCounter = 0;
function nextId(): string {
  return String(++idCounter);
}

type FormValues = Record<string, string | boolean>;

// Tracks the currently focused entry so ActionPanel can target "Remove This Entry"
interface FocusedEntry {
  entryId: string;
  sectionId: string | null; // null = top-level
}

export default function Command() {
  const [mode, setMode] = useState<Mode>("freeform");
  const [topLevelEntries, setTopLevelEntries] = useState<Entry[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [focusedEntry, setFocusedEntry] = useState<FocusedEntry | null>(null);

  function addTopLevelEntry() {
    setActiveSectionId(null);
    setTopLevelEntries((prev) => [...prev, { id: nextId() }]);
  }

  function removeTopLevelEntry(entryId: string) {
    setTopLevelEntries((prev) => prev.filter((e) => e.id !== entryId));
    setFocusedEntry(null);
  }

  function addSection() {
    const newId = nextId();
    setSections((prev) => [...prev, { id: newId, entries: [{ id: nextId() }] }]);
    setActiveSectionId(newId);
  }

  function removeSection(sectionId: string) {
    setSections((prev) => {
      const filtered = prev.filter((s) => s.id !== sectionId);
      if (activeSectionId === sectionId) {
        setActiveSectionId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
      }
      return filtered;
    });
    setFocusedEntry(null);
  }

  function addEntryToSection(sectionId: string) {
    setActiveSectionId(sectionId);
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sectionId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], entries: [...updated[idx].entries, { id: nextId() }] };
      return updated;
    });
  }

  function removeSectionEntry(sectionId: string, entryId: string) {
    const isLastEntry = sections.find((s) => s.id === sectionId)?.entries.length === 1;
    if (isLastEntry && activeSectionId === sectionId) setActiveSectionId(null);
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sectionId);
      if (idx === -1) return prev;
      const remaining = prev[idx].entries.filter((e) => e.id !== entryId);
      if (remaining.length === 0) return prev.filter((s) => s.id !== sectionId);
      const updated = [...prev];
      updated[idx] = { ...updated[idx], entries: remaining };
      return updated;
    });
    setFocusedEntry(null);
  }

  async function handleSubmit(values: FormValues) {
    const durationSeconds = parseDuration(values.duration as string) ?? DEFAULT_DURATION_SECONDS;
    const selfDestruct = values.selfDestruct as boolean;

    let secretPayload: string;

    if (mode === "freeform") {
      const secret = (values.secret as string).trim();
      if (!secret) {
        await showToast({ style: Toast.Style.Failure, title: "Secret cannot be empty" });
        return;
      }
      secretPayload = secret;
    } else {
      const json: Record<string, string | Record<string, string>> = {};
      const usedTopLevelKeys = new Set<string>();

      for (const entry of topLevelEntries) {
        const k = (values[`key_${entry.id}`] as string)?.trim();
        const v = (values[`val_${entry.id}`] as string)?.trim();

        if (!k && !v) continue;

        if (!k || !v) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Incomplete entry",
            message: "Each entry needs both a key and a value",
          });
          return;
        }

        if (usedTopLevelKeys.has(k)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Duplicate key",
            message: `"${k}" appears more than once`,
          });
          return;
        }

        usedTopLevelKeys.add(k);
        json[k] = v;
      }

      const usedSectionNames = new Set<string>();

      for (const section of sections) {
        const sName = (values[`sec_name_${section.id}`] as string)?.trim();
        const hasAnyEntry = section.entries.some((e) => {
          const k = (values[`sec_${section.id}_key_${e.id}`] as string)?.trim();
          const v = (values[`sec_${section.id}_val_${e.id}`] as string)?.trim();
          return k || v;
        });

        if (!sName && !hasAnyEntry) continue;

        if (!sName) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Missing section name",
            message: "Fill in the section name or remove its entries",
          });
          return;
        }

        if (usedTopLevelKeys.has(sName) || usedSectionNames.has(sName)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Duplicate name",
            message: `"${sName}" is already used as a key or section name`,
          });
          return;
        }

        const sObj: Record<string, string> = {};
        const usedSectionKeys = new Set<string>();

        for (const entry of section.entries) {
          const k = (values[`sec_${section.id}_key_${entry.id}`] as string)?.trim();
          const v = (values[`sec_${section.id}_val_${entry.id}`] as string)?.trim();

          if (!k && !v) continue;

          if (!k || !v) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Incomplete entry",
              message: `Each entry in "${sName}" needs both a key and a value`,
            });
            return;
          }

          if (usedSectionKeys.has(k)) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Duplicate key",
              message: `"${k}" appears more than once in "${sName}"`,
            });
            return;
          }

          usedSectionKeys.add(k);
          sObj[k] = v;
        }

        if (Object.keys(sObj).length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Empty section",
            message: `Section "${sName}" has no valid entries`,
          });
          return;
        }

        usedSectionNames.add(sName);
        json[sName] = sObj;
      }

      if (Object.keys(json).length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No entries",
          message: "Add at least one entry before submitting",
        });
        return;
      }

      secretPayload = JSON.stringify(json, null, 2);
    }

    await showToast({ style: Toast.Style.Animated, title: "Creating secret..." });

    try {
      const expirationTimestamp = Math.floor(Date.now() / 1000) + durationSeconds;
      const shareUrl = await createSecret(secretPayload, expirationTimestamp, selfDestruct);
      await Clipboard.copy(shareUrl);

      const durationDisplay = formatDuration(durationSeconds);
      const destructNote = selfDestruct ? "Self-destructs after first view." : "Can be viewed multiple times.";

      await showHUD(`Copied! Expires in ${durationDisplay}. ${destructNote}`);
    } catch (error) {
      console.error("Failed to create secret:", error);
      const message = error instanceof Error ? error.message : "Please try again.";
      await showToast({ style: Toast.Style.Failure, title: "Failed to create secret", message });
    }
  }

  const isMultipleValues = mode === "multipleValues";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Secret" onSubmit={handleSubmit} />
          {isMultipleValues && (
            <>
              <ActionPanel.Section title="Add">
                <Action title="Add Entry" shortcut={{ modifiers: ["cmd"], key: "n" }} onAction={addTopLevelEntry} />
                <Action
                  title="Add Section"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  onAction={addSection}
                />
                {sections.map((section, si) => (
                  <Action
                    key={section.id}
                    title={`Add Entry to Section ${si + 1}`}
                    shortcut={activeSectionId === section.id ? { modifiers: ["cmd", "opt"], key: "n" } : undefined}
                    onAction={() => addEntryToSection(section.id)}
                  />
                ))}
              </ActionPanel.Section>
              <ActionPanel.Section title="Remove">
                {focusedEntry && focusedEntry.sectionId === null && (
                  <Action
                    title="Remove This Entry"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => removeTopLevelEntry(focusedEntry.entryId)}
                  />
                )}
                {focusedEntry &&
                  focusedEntry.sectionId !== null &&
                  (() => {
                    const sec = sections.find((s) => s.id === focusedEntry.sectionId);
                    const si = sections.findIndex((s) => s.id === focusedEntry.sectionId);
                    if (!sec) return null;
                    // Only one entry left — removing it would delete the section, so surface that action only
                    if (sec.entries.length <= 1) {
                      return (
                        <Action
                          title={`Remove Section ${si + 1}`}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                          onAction={() => removeSection(focusedEntry.sectionId!)}
                        />
                      );
                    }
                    return (
                      <Action
                        title="Remove This Entry"
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                        onAction={() => removeSectionEntry(focusedEntry.sectionId!, focusedEntry.entryId)}
                      />
                    );
                  })()}
                {sections.map((section, si) => {
                  // Skip sections already rendered above with a shortcut (focused section with 1 entry)
                  const isCoveredAbove = focusedEntry?.sectionId === section.id && section.entries.length <= 1;
                  if (isCoveredAbove) return null;
                  return (
                    <Action
                      key={section.id}
                      title={`Remove Section ${si + 1}`}
                      style={Action.Style.Destructive}
                      onAction={() => removeSection(section.id)}
                    />
                  );
                })}
              </ActionPanel.Section>
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Mode" defaultValue="freeform" onChange={(v) => setMode(v as Mode)}>
        <Form.Dropdown.Item value="freeform" title="Free Form" />
        <Form.Dropdown.Item value="multipleValues" title="Multiple Values" />
      </Form.Dropdown>

      {!isMultipleValues ? (
        <Form.TextArea id="secret" title="Secret" placeholder="Enter your secret (password, API key, note...)" />
      ) : (
        <>
          <Form.Description title="Add" text="⌘N  Entry   ·   ⌘⇧N  Section   ·   ⌘⌥N  Entry to Active Section" />

          {topLevelEntries.map((entry, i) => (
            <Fragment key={entry.id}>
              <Form.TextField
                id={`key_${entry.id}`}
                title={`Key ${i + 1}`}
                placeholder="key"
                onFocus={() => setFocusedEntry({ entryId: entry.id, sectionId: null })}
                onBlur={() => setActiveSectionId(null)}
              />
              <Form.TextField
                id={`val_${entry.id}`}
                title={`Value ${i + 1}`}
                placeholder="value"
                onFocus={() => setFocusedEntry({ entryId: entry.id, sectionId: null })}
                onBlur={() => setActiveSectionId(null)}
              />
            </Fragment>
          ))}

          {sections.map((section, si) => (
            <Fragment key={section.id}>
              <Form.Separator />
              <Form.TextField
                id={`sec_name_${section.id}`}
                title={`Section ${si + 1}`}
                placeholder="Section name"
                onFocus={() => {
                  setActiveSectionId(section.id);
                  setFocusedEntry(null);
                }}
                onBlur={() => setActiveSectionId(section.id)}
              />
              {section.entries.map((entry, ei) => (
                <Fragment key={entry.id}>
                  <Form.TextField
                    id={`sec_${section.id}_key_${entry.id}`}
                    title={`  Key ${ei + 1}`}
                    placeholder="key"
                    onFocus={() => {
                      setActiveSectionId(section.id);
                      setFocusedEntry({ entryId: entry.id, sectionId: section.id });
                    }}
                    onBlur={() => setActiveSectionId(section.id)}
                  />
                  <Form.TextField
                    id={`sec_${section.id}_val_${entry.id}`}
                    title={`  Value ${ei + 1}`}
                    placeholder="value"
                    onFocus={() => {
                      setActiveSectionId(section.id);
                      setFocusedEntry({ entryId: entry.id, sectionId: section.id });
                    }}
                    onBlur={() => setActiveSectionId(section.id)}
                  />
                </Fragment>
              ))}
              <Form.Description title="↳ Add entry" text={`Open Actions (⌘K) › Add Entry to Section ${si + 1}`} />
            </Fragment>
          ))}
        </>
      )}

      <Form.Dropdown id="duration" title="Expires in" defaultValue="1h">
        <Form.Dropdown.Item value="30m" title="30 minutes" />
        <Form.Dropdown.Item value="1h" title="1 hour" />
        <Form.Dropdown.Item value="24h" title="24 hours" />
        <Form.Dropdown.Item value="7d" title="7 days" />
      </Form.Dropdown>
      <Form.Checkbox id="selfDestruct" title="Self-destruct" label="Delete after first view" defaultValue={true} />
    </Form>
  );
}
