<!-- Generated and maintained by Ralph -->

# Implementation Plan

**Priority ordered list of tasks to complete UX polish and caching features.**

**Last Updated:** 2026-01-18 19:21 (revalidated build/test/lint/tsc; official icon asset applied)

---

## ✅ COMPLETED TASKS

- **US-001 through US-012**: All passing ✓ (MVP functionality complete)
- **US-015**: Base URL normalization - VERIFIED at src/api/harvest.ts:47-48 ✓
  - Trims whitespace: `baseUrl?.trim()`
  - Falls back to default: `resolvedBaseUrl || DEFAULT_BASE_URL`
  - Removes trailing slashes: `.replace(/\/$/, "")`
- **US-013**: Empty-state flash suppressed while loading - VERIFIED at src/jobs/JobsList.tsx:75 and src/jobs/JobPipeline.tsx:108 ✓
- **US-018**: Stage counts - VERIFIED at src/jobs/JobPipeline.tsx:121 ✓
  - Format: `title={section.title}` with `subtitle={`${section.applications.length}`}`
  - Example output: title "Applied", subtitle "5"
- **US-017**: Direct launch into jobs list - VERIFIED at src/index.tsx:1-3 ✓
- **US-014**: Restore global fetch after tests - VERIFIED at src/jobs/harvestData.test.ts:35 ✓
  - Uses `vi.stubGlobal("fetch", ...)` and `vi.unstubAllGlobals()` cleanup
- **US-016**: Remove legacy raycast.json manifest - VERIFIED removed from repo ✓
- **US-019**: Add @raycast/utils dependency - VERIFIED at package.json (using `^2.2.2` after `^1.20.0` not found) ✓
- **US-020**: Cache utilities module - VERIFIED at src/cache/cacheUtils.ts ✓
- **US-021**: JobsList caching - VERIFIED at src/jobs/JobsList.tsx ✓
- **US-022**: JobPipeline caching - VERIFIED at src/jobs/JobPipeline.tsx ✓
- **US-023**: Background refresh command - VERIFIED at src/refresh-cache.ts ✓
- **US-024**: Manifest background command - VERIFIED at package.json (commands array) ✓
- **Manual**: Extension icon updated with official Greenhouse icon ✓
  - Source: brand.greenhouse.com visual guidelines → Greenhouse icon (green)
  - Asset: `assets/command-icon.png` (512x512 PNG, RGBA)

---

## 🔴 HIGH PRIORITY - UX Polish (Quick Wins)
All quick-win UX tasks are complete.

---

## 🟡 MEDIUM PRIORITY - Infrastructure Cleanup
All infrastructure cleanup tasks are complete.

---

## 🔵 LARGE FEATURES - Caching Implementation (specs/caching.md)

All caching implementation tasks (US-019 through US-024) are completed.

## 📋 MANUAL TASKS (Not Automated)

- None (icon asset applied; verify appearance in Raycast light/dark themes).

## 🔍 VERIFICATION CHECKLIST

After implementing all tasks, verify:

### Build & Test
- [x] `npm install` succeeds
- [x] `npm run build` succeeds
- [x] `npm test` passes (all 13 tests)
- [x] `npm run lint` passes
- [x] `npx tsc --noEmit` passes
**Last Validation Run:** 2026-01-18 19:21 (`npm run build`, `npm test`, `npx tsc --noEmit`, `npm run lint`)

### Raycast Testing
- [ ] "Greenhouse" command opens jobs list immediately (US-017)
- [ ] No empty-state flash while loading (US-013)
- [ ] Jobs list shows cached data instantly on first open (US-021)
- [ ] Pipeline shows cached data instantly when opened (US-022)
- [ ] Stage headings show counts using `List.Section` subtitle (US-018)
- [ ] Background refresh command appears in search (US-024)
- [ ] Background refresh runs and caches data (US-023)
- [ ] Manual background refresh trigger works
- [ ] Extension icon displays correctly (light/dark theme verification)

### Edge Cases
- [ ] Empty baseUrl preference falls back to default (US-015) - already implemented ✓
- [ ] Error toasts appear on API failures
- [x] Empty view appears only when loading completes with no data (US-013)
- [ ] Deep links to candidates work correctly

---

## 📊 PRIORITY SUMMARY

### Phase 1: Quick UX Wins (Do First) - ~15 minutes
1. ✅ **US-018** - Stage counts (VERIFIED: subtitle at JobPipeline.tsx:121)
2. ✅ **US-015** - Base URL normalization (VERIFIED: already implemented at harvest.ts:47-48)
3. ✅ **US-013** - Fix empty-state flash (JobsList.tsx:75, JobPipeline.tsx:108)
4. ✅ **US-017** - Direct launch (index.tsx:1-3)

### Phase 2: Infrastructure Cleanup (Complete)
5. ✅ **US-016** - Remove raycast.json (completed)

### Phase 3: Caching Implementation (Do Third) - ~2-3 hours
6. ✅ **US-019** - Install @raycast/utils (npm install)
7. ✅ **US-020** - Create cache utilities module (new file)
8. ✅ **US-021** - Migrate JobsList to useCachedPromise
9. ✅ **US-022** - Migrate JobPipeline to useCachedPromise
10. ✅ **US-023** - Create background refresh command (new file)
11. ✅ **US-024** - Add background command to manifest

### Manual Tasks
- Extension icon replacement (human action required)

---

## 🚨 IMPORTANT NOTES

### Implementation Rules
- **DO NOT implement** - this is a planning document only
- All implementations must pass `npm test`, `npm run build`, and `npm run lint`
- Test in Raycast after each phase to verify functionality
- Maintain error handling patterns (toasts, empty views)
- Follow existing code style and conventions

### Verified Findings
- ✅ **US-015** base URL normalization VERIFIED at src/api/harvest.ts:47-48
- ✅ **US-013** empty-state flash fix VERIFIED at src/jobs/JobsList.tsx:75 and src/jobs/JobPipeline.tsx:108
- ✅ **US-018** stage counts use `List.Section` subtitle at src/jobs/JobPipeline.tsx:121
- ✅ **US-017** direct launch VERIFIED at src/index.tsx:1-3
- ✅ **US-016** raycast.json removed; package.json is authoritative
- ✅ **US-014** test cleanup VERIFIED at src/jobs/harvestData.test.ts:35
- ✅ **US-019** @raycast/utils dependency added; package.json updated to ^2.2.2
- ✅ **US-020** cache utilities created at src/cache/cacheUtils.ts
- ✅ **US-021** JobsList uses cached data flow at src/jobs/JobsList.tsx
- ✅ **US-022** JobPipeline uses cached data flow at src/jobs/JobPipeline.tsx
- ✅ **US-023** background refresh command at src/refresh-cache.ts
- ✅ **US-024** refresh-cache command added to package.json manifest

### Architecture Decisions
- **Caching strategy**: `useCachedPromise` from @raycast/utils for automatic cache management
- **Cache TTL**: 60 minutes (soft target - stale data shown immediately, then revalidated)
- **Background refresh**: Hourly automatic refresh to keep cache warm
- **Error handling**: Preserve existing toast notifications and empty view patterns
- **Direct launch**: Remove intermediate menu for better UX (specs/direct-launch.md)

### Testing Notes
- Tests currently pass (13/13 passing)
- Global fetch restored in harvestData.test.ts (US-014)
- All caching changes should maintain or add test coverage

---

## 📈 PROGRESS TRACKING

**Analysis Date:** 2026-01-18
**Analyzed By:** 6 parallel Sonnet exploration agents
**Verification Method:** Source code inspection, line-by-line analysis, cross-file verification

**Completion Status:**
- ✅ **Completed:** 12/12 user stories (US-013 through US-024)
- ❌ **Remaining:** 0 user stories
- ✅ **Manual:** 0 tasks (icon replaced; visual verification pending)

**Effort Estimates:**
- Phase 1 (UX Polish): ~15 minutes
- Phase 2 (Infrastructure): ~20 minutes
- Phase 3 (Caching): ~2-3 hours
- **Total Development Time:** ~3-4 hours

**Dependencies:**
- No blockers identified - all tasks completed

---

## 📚 REFERENCES

**Specifications:**
- specs/SPEC.md - Overall UX + caching spec
- specs/direct-launch.md - US-017 direct launch specification
- specs/stage-counts.md - US-018 stage counts specification (implemented ✓)
- specs/caching.md - US-019 through US-024 caching specifications

**Implementation Files:**
- src/index.tsx - Root command (US-017)
- src/jobs/JobsList.tsx - Jobs list view (US-013, US-021)
- src/jobs/JobPipeline.tsx - Pipeline view (US-013, US-018 ✓, US-022)
- src/api/harvest.ts - API client (US-015 ✓)
- src/jobs/harvestData.ts - Data fetching utilities
- src/jobs/harvestData.test.ts - Test file (US-014)
- package.json - Manifest (US-016, US-019, US-024)

**Analysis Agents:**
- Agent a95d0df - US-015 base URL normalization verification
- Agent a0d4636 - US-018 stage counts initial verification
- Agent abc6c5c - US-013 empty state flash verification
- Agent abd3804 - US-017 direct launch verification
- Agent a00787b - US-016 raycast.json analysis
- Agent a53f76f - US-014 test cleanup verification

---

*End of Implementation Plan*
