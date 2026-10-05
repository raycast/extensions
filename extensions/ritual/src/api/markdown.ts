import type { RitualTask } from "./types";

/// What the notes area says when the task has none.
///
/// Italic and quiet, so it reads as an absence rather than as content. Exported
/// because the tests assert against it: a placeholder is UI copy, and pinning
/// its exact spelling in six test files is how it drifts.
export const NOTES_PLACEHOLDER = "*No notes yet.*";

/// The detail panel's markdown body: the task's title, then its notes, then
/// its checklist.
///
/// ALWAYS RETURNS A BODY. It used to return `undefined` for a task with neither
/// notes nor subtasks, on the reasoning that Raycast gives the markdown pane
/// its share of the panel whether or not anything is in it — so a heading-only
/// body would spend half the panel on nothing. The cost of that thrift was a
/// panel that, for the most common task in the list, showed a column of
/// metadata and no indication of which task it belonged to. The title is the
/// one thing worth that space, and an empty notes area that says it is empty
/// beats one that is indistinguishable from a panel that failed to load.
///
/// The trade is real and worth stating: the metadata sidebar now gets less room
/// on tasks that have nothing written down. That is the intended exchange.
///
/// Subtasks render as a plain bulleted list, with completed items struck
/// through — NOT as a `- [x]` / `- [ ]` markdown task list. Raycast draws that
/// syntax as a hollow square glyph that reads as an interactive checkbox, and
/// these are not interactive: the extension has no way to tick a subtask (the
/// CLI exposes no subtask command), so a checkbox is an affordance that lies.
export function taskMarkdown(task: RitualTask): string {
  const sections: string[] = [];
  // Whitespace-only notes are no notes. Left alone they print a blank line
  // under the title, which looks like notes that failed to load rather than
  // notes that were never written.
  const notes = task.notes?.trim();
  sections.push(notes && notes.length > 0 ? notes : NOTES_PLACEHOLDER);
  if (task.checklist?.length) {
    sections.push(
      task.checklist
        .map((item) => (item.done ? `- ~~${item.title}~~` : `- ${item.title}`))
        .join("\n"),
    );
  }
  return `# ${escapeMarkdown(task.title)}\n\n${sections.join("\n\n")}`;
}

/// Titles are user text rendered into a markdown heading, so their punctuation
/// is live syntax: a `#` promotes the rest of the line, a `*` or `_` italicises
/// through it, a `[` opens a link that never closes. Escape the characters that
/// can change how the line renders and leave the rest alone — over-escaping
/// shows backslashes to the user, which is its own bug.
function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]#])/g, "\\$1");
}
