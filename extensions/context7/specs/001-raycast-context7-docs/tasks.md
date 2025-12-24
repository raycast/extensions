# Tasks: Raycast Extension for Context7 Documentation Search

**Input**: Design documents from `/specs/001-raycast-context7-docs/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Not requested - manual testing via Raycast Dev mode per project constraints.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Ensure project structure matches implementation plan

- [X] T001 Verify project structure and create missing directories (src/components/, src/lib/, src/hooks/)
- [X] T002 Update package.json with Context7 API Key preference configuration

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Create TypeScript interfaces in src/lib/types.ts (LibrarySearchResult, SearchResponse, Preferences, APIError)
- [X] T004 [P] Implement Context7 API client in src/lib/api.ts (search, getDocs, error handling for 401/404/429)
- [X] T005 Create search hook with 300ms debounce in src/hooks/useContext7Search.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Quick Library Search (Priority: P1) 🎯 MVP

**Goal**: Enable developers to search for libraries on Context7 directly from Raycast with results displayed in a list view.

**Independent Test**: 
1. Invoke "Search Context7 Docs" command in Raycast
2. Type "nextjs routing" in the search bar
3. Verify a list of matching libraries appears with names, descriptions, and Context7 Library IDs

### Implementation for User Story 1

- [X] T006 [US1] Implement main List command in src/search-context7-docs.tsx with search bar
- [X] T007 [US1] Add List.Item rendering with library metadata (title, description, stars, trustScore) and display all results in scrollable list in src/search-context7-docs.tsx
- [X] T008 [US1] Add loading state and empty state handling in src/search-context7-docs.tsx
- [X] T009 [US1] Add error toast handling for network errors and rate limiting in src/search-context7-docs.tsx

**Checkpoint**: User Story 1 complete - search and list display functional

---

## Phase 4: User Story 2 - View Documentation Details (Priority: P1)

**Goal**: Allow developers to view complete Markdown documentation for a selected library without leaving Raycast.

**Independent Test**:
1. Select any library from search results
2. Verify detail view displays formatted Markdown with readable code blocks
3. Test "Copy Content" and "Open in Browser" actions

### Implementation for User Story 2

- [X] T010 [US2] Create DocDetailView component in src/components/DocDetailView.tsx with Markdown rendering
- [X] T011 [US2] Add "Copy Content" action to copy full documentation to clipboard in src/components/DocDetailView.tsx
- [X] T012 [US2] Add "Open in Browser" action to open library URL in browser in src/components/DocDetailView.tsx
- [X] T013 [US2] Connect List.Item selection to DocDetailView navigation in src/search-context7-docs.tsx
- [X] T014 [US2] Add loading and error states for documentation fetch in src/components/DocDetailView.tsx

**Checkpoint**: User Story 2 complete - full search → view documentation workflow functional

---

## Phase 5: User Story 3 - Configure API Key for Higher Quota (Priority: P2)

**Goal**: Enable power users to configure their Context7 API Key in Raycast preferences to avoid rate limiting.

**Independent Test**:
1. Open Raycast preferences for the extension
2. Verify "Context7 API Key" field exists with description
3. Enter an API Key and verify subsequent searches include it in request headers

### Implementation for User Story 3

- [X] T015 [US3] Implement preference reading in src/lib/api.ts to include API Key in Authorization header
- [X] T016 [US3] Add subtle UI hint when API Key is not configured suggesting higher limits in src/search-context7-docs.tsx
- [X] T017 [US3] Add "Open Preferences" action in error toast for 429 rate limit errors in src/lib/api.ts

**Checkpoint**: User Story 3 complete - API Key configuration functional

---

## Phase 6: User Story 4 - Copy Code Snippets Quickly (Priority: P3)

**Goal**: Allow developers to quickly copy specific code snippets from documentation to clipboard without manual selection.

**Independent Test**:
1. View documentation with multiple code blocks
2. Use dedicated action to copy a specific code block
3. Verify only that code block (without Markdown formatting) is copied

### Implementation for User Story 4

- [X] T018 [US4] Parse documentation content to extract individual code blocks with indices in src/components/DocDetailView.tsx
- [X] T019 [US4] Add "Copy Code Block N" actions to ActionPanel for each detected code block in src/components/DocDetailView.tsx

**Checkpoint**: User Story 4 complete - all user stories implemented

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and improvements

- [X] T020 [P] Add debug logging for API responses (development mode only) in src/lib/api.ts
- [X] T021 [P] Verify Markdown rendering with complex documentation (e.g., react-admin)
- [X] T022 Run quickstart.md testing checklist (anonymous access, API key, error handling, Markdown rendering)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 and US2 are both P1, but US2 depends on US1 (need search results to view details)
  - US3 (P2) and US4 (P3) can proceed after US1/US2
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after US1 - Needs List view to navigate from
- **User Story 3 (P2)**: Can start after Foundational - Modifies API client, integrates with search
- **User Story 4 (P3)**: Can start after US2 - Extends DocDetailView component

### Within Each User Story

- Core component structure first
- Actions and interactions second
- Error handling and polish last

### Parallel Opportunities

- T003 and T004 can run in parallel (different files)
- T020 and T021 can run in parallel
- Within US2: T010 (component) must complete before T011-T014

---

## Parallel Example: Foundational Phase

```bash
# Launch these tasks together (different files, no dependencies):
Task: "T003 Create TypeScript interfaces in src/lib/types.ts"
Task: "T004 Implement Context7 API client in src/lib/api.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Quick Search)
4. Complete Phase 4: User Story 2 (View Documentation)
5. **STOP and VALIDATE**: Test full search → view workflow
6. Deploy/demo if ready - this is a functional MVP!

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Search works → Can demo
3. Add User Story 2 → Full workflow → **MVP Complete!**
4. Add User Story 3 → Power users get higher limits
5. Add User Story 4 → Enhanced code copying
6. Polish → Production ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Testing is manual via Raycast Dev mode (`pnpm dev` or `ray develop`)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- API base URL: `https://context7.com/api/v2/`
- FR-019: Context7 API does not support pagination - display all results in single scrollable list
- US4: Raycast Detail view doesn't support text selection - use ActionPanel with numbered code block actions

