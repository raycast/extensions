// Opt-in live integration test. Only IDs created during this run may be mutated.
// Run inside Raycast's development runtime; never part of npm test.
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import getAccessToken from "../src/utils/getAccessToken";
import getUserInfo from "../src/utils/getUserInfo";
import { granolaFetch } from "../src/utils/granolaFetch";
import {
  createNoteFromTranscript,
  createDocumentList,
  getDocumentList,
  addDocumentToList,
  removeDocumentFromList,
  deleteDocumentList,
  updateDocumentNotes,
  saveToNotion,
  chatWithDocuments,
  fetchUpcomingEvents,
} from "../src/utils/granolaApi";

export async function runLiveMutations(reportPath: string) {
  const report = {
    run: randomUUID(),
    noteId: "",
    folderId: "",
    notionPage: "",
    checks: [] as Array<{ operation: string; result: string }>,
  };
  const save = () => writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
  const check = async (operation: string, fn: () => Promise<void>) => {
    try {
      await fn();
      report.checks.push({ operation, result: "passed" });
    } catch (e) {
      report.checks.push({ operation, result: e instanceof Error ? e.message : "failed" });
    }
    await save();
  };
  const post = async (endpoint: string, body: unknown) =>
    granolaFetch(`https://api.granola.ai/v1/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await getAccessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  await getAccessToken(true);
  report.checks.push({ operation: "refresh", result: "passed" });
  await save();
  await check("create_note_and_generate_summary", async () => {
    const note = await createNoteFromTranscript(
      "This is a disposable Raycast integration test, not a real meeting. Title: Raycast Integration Test. We agreed to test authentication and export a dummy note. Alex will verify the folder tomorrow. No real customer or meeting information is included.",
      (progress) => {
        if (progress.documentId) {
          report.noteId = progress.documentId;
          void save();
        }
      },
    );
    if (!note.summaryContent.trim()) throw new Error("Empty generated summary");
  });
  if (report.noteId) {
    await check("label_dummy_note", async () => {
      await post("update-document", {
        id: report.noteId,
        title: `Raycast Integration Test ${report.run}`,
        transcribe: false,
      });
    });
    await check("update_note", async () => {
      await updateDocumentNotes(
        report.noteId,
        "# Dummy test note\n\nThis disposable note tests the Raycast Granola integration.",
      );
    });
    await check("create_folder", async () => {
      const f = await createDocumentList(`Raycast Integration Test ${report.run}`);
      if (!f.id) throw new Error("Folder response missing ID");
      report.folderId = f.id;
    });
    if (report.folderId) {
      await check("add_note_to_folder", async () => {
        await addDocumentToList(report.folderId, report.noteId);
        const f = await getDocumentList(report.folderId);
        if (!f.document_ids?.includes(report.noteId)) throw new Error("Added note missing from folder readback");
      });
      await check("remove_note_from_folder", async () => {
        await removeDocumentFromList(report.folderId, report.noteId);
        const f = await getDocumentList(report.folderId);
        if (f.document_ids?.includes(report.noteId)) throw new Error("Removed note still in folder");
      });
    }
    await check("chat_with_dummy_note", async () => {
      const reply = await chatWithDocuments({
        document_ids: [report.noteId],
        chat_history: [
          {
            role: "USER",
            text: "Reply with one sentence stating the task agreed in this dummy integration test note.",
            file_attachments: [],
          },
        ],
        num_meetings_in_context: 1,
        enable_reasoning: false,
      });
      if (!reply.trim()) throw new Error("Empty chat response");
    });
    await check("save_dummy_note_to_notion", async () => {
      const saved = await saveToNotion(report.noteId);
      report.notionPage = saved.page_url;
      if (!saved.page_url) throw new Error("Notion response missing page URL");
    });
  }
  await check("refresh_calendar", async () => {
    await fetchUpcomingEvents();
  });
  if (report.folderId)
    await check("delete_test_folder", async () => {
      await deleteDocumentList(report.folderId);
    });
  if (report.noteId)
    await check("trash_test_note", async () => {
      await post("update-document", { id: report.noteId, deleted_at: new Date().toISOString(), transcribe: false });
    });
  return report;
}

export async function runLiveFolderTest(reportPath: string) {
  const id = randomUUID();
  let folderId: string | undefined;
  const checks: string[] = [];
  const headers = { Authorization: `Bearer ${await getAccessToken()}`, "Content-Type": "application/json" };
  const post = (endpoint: string, body: unknown) =>
    granolaFetch(`https://api.granola.ai/v1/${endpoint}`, { method: "POST", headers, body: JSON.stringify(body) });
  const report = { noteId: id, folderId: "", checks };
  const save = () => writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
  await save();
  try {
    const user = await getUserInfo();
    await post("create-document", {
      id,
      user_id: user.id,
      title: `Raycast Folder Test ${id}`,
      transcribe: false,
      creation_source: "macOS",
    });
    checks.push("created dummy note");
    const folder = await createDocumentList(`Raycast Folder Test ${id}`);
    if (!folder.id) throw new Error("No folder ID");
    folderId = folder.id;
    report.folderId = folderId;
    await save();
    await addDocumentToList(folderId, id);
    if (!(await getDocumentList(folderId)).document_ids?.includes(id)) throw new Error("Add readback failed");
    checks.push("add membership verified");
    await removeDocumentFromList(folderId, id);
    if ((await getDocumentList(folderId)).document_ids?.includes(id)) throw new Error("Remove readback failed");
    checks.push("remove membership verified");
  } catch (error) {
    checks.push(error instanceof Error ? error.message : "failed");
  } finally {
    if (folderId) {
      await deleteDocumentList(folderId);
      checks.push("test folder deleted");
    }
    await post("update-document", { id, deleted_at: new Date().toISOString(), transcribe: false });
    checks.push("dummy note trashed");
    await save();
  }
  return report;
}
