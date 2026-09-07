# Live integration validation

Last run: 2026-09-07, macOS, Granola 7.543.0, actual Raycast development extension.

## Results

- OAuth device authorization and exchange: HTTP 200; separate session created after browser approval.
- Refresh: HTTP 200, rotated refresh token saved through Raycast OAuth storage; concurrent callers received the saved session. Subsequent API reads succeeded without browser approval.
- All 10 read routes in `endpointCatalog.ts`: HTTP 200 and basic response-shape validation (notes, user, folder metadata, document set, recipes, document batch, transcript, panels, document metadata, individual folder).
- Dummy note workflow: create-document, update-document, insert-transcriptions, llm-proxy, llm-proxy-stream, create-document-panel, update-document-panel all returned HTTP 200; title and summary workflow completed.
- Dummy folder: create-document-list-v2, add-document-to-list, remove-document-from-list, delete-document-list-v2 all returned HTTP 200. The first readback exposed a documents/document_ids mismatch; after normalization, a second fixture verified membership appeared after add and disappeared after remove.
- chat-with-documents: HTTP 200 with a nonempty streamed reply scoped to the dummy note.
- refresh-google-events: HTTP 200.
- save-to-notion: HTTP 200, success status and page URL returned for the dummy note. Browser rendering was not verified because the test browser was not signed in to Notion. The test page remains in Notion; the integration has no page-deletion endpoint.
- Cleanup: both temporary folders deleted; both dummy Granola notes moved to Trash. Readback confirmed all four were absent from active lists. No existing meetings or folders were modified.

These results establish route compatibility for the tested account and fixtures, not every plan/input variant. Windows still needs a live run. YouTube transcript fetching is delegated to its library and is not part of the Granola route catalog; its outcomes have separate safe diagnostics.

## Repeat read-only checks

Run Granola **Check Connection** in Raycast. **Verify Token Refresh** deliberately refreshes the extension's own session, then checks reads. Copy Diagnostics produces a support report without credentials or meeting contents.

## Repeat mutation checks (explicit opt-in only)

`live-mutations.ts` exports `runLiveMutations(reportPath)` and `runLiveFolderTest(reportPath)` for the Raycast development runtime. These use the same exported production API functions as the extension. They create disposable fixtures and save a journal containing their IDs, outcomes, and the returned Notion page link. No tokens are written to that journal.

After obtaining authorization, temporarily register a developer view command with an Action that invokes `runLiveMutations` and renders its returned report. Import it from `../tests/live-mutations`. Use an absolute, private local report path. The command should run only on explicit action, not on mount or hot reload. Remove the temporary command and its manifest entry before publishing. The production manifest intentionally exposes only read checks.

Review the journal after the run and verify cleanup. A process crash can interrupt cleanup; only delete or trash the exact IDs recorded for that test. Notion exports remain separate and must be removed in Notion if desired. Do not use real meeting IDs for mutation tests.
