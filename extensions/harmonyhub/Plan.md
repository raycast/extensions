# HarmonyHub Raycast Extension Migration

Last Updated: 2025-02-17 14:54

## Phase 1: Repository Setup

Status: Complete

- [x] Create extension directory in raycast/extensions
- [x] Copy development configuration files
- [x] Set up .gitignore for Windsurf files
- [x] Using existing Raycast extensions fork from MuteDeck
- [x] Establish clean extension structure

## Phase 2: Asset Migration

Status: In Progress

- [x] Command icons (assets/*.png)
- [ ] Screenshots (metadata/screenshots/*)
- [ ] Store assets (assets/store/*)
- [x] Extension icon (icon.png)

## Phase 3: Code Migration

Status: In Progress

- [-] Migrate source files to src/:
  - [x] Main control.tsx
  - [ ] Components:
    - [ ] HarmonyCommand
    - [ ] Other UI components
  - [ ] Hooks:
    - [ ] useHarmony
    - [ ] Other custom hooks
  - [ ] Services:
    - [ ] Harmony API integration
  - [ ] Types:
    - [ ] HarmonyStageType
    - [ ] Other type definitions
- [ ] Update imports and paths
- [ ] Clean up implementation
- [ ] Remove unused code

## Phase 4: Configuration

Status: In Progress

- [x] Update package.json:
  - [x] Commands configuration
  - [x] Preferences setup
  - [x] Dependencies
  - [x] Categories and metadata
  - [x] Icon paths
- [x] Configure preferences with correct defaults
- [ ] Update API endpoint handling

## Phase 5: Testing & Validation

Status: Pending

- [ ] Install dependencies
- [ ] Build extension
- [ ] Test all commands
- [ ] Verify preferences work
- [ ] Check all icons display correctly
- [ ] Validate store assets

## Phase 6: Store Assets

Status: Pending

- [ ] Screenshots:
  - [ ] Command List
  - [ ] Status Display
  - [ ] Additional functionality shots
  - [ ] Verify requirements:
    - 1600×1000 pixels
    - Dark mode
    - PNG format
    - No personal information
- [ ] Store Description:
  - [ ] Remove personal GitHub repo references
  - [ ] Update support links to Raycast store
  - [ ] Verify all features accurately described
- [ ] Categories and Metadata:
  - [ ] Verify categories in package.json
  - [ ] Check extension title and description
  - [ ] Validate command descriptions

## Phase 7: Documentation & Final Steps

Status: Pending

- [ ] Update README.md with:
  - [ ] Installation instructions
  - [ ] Feature overview
  - [ ] Configuration guide
- [ ] Final cleanup:
  - [ ] Remove development files
  - [ ] Check git ignores
  - [ ] Verify all required files included

---
## Notes
- [2025-02-17] Starting fresh with clean Raycast extension structure
- [2025-02-17] Following successful MuteDeck migration pattern

---
## Files to NOT Migrate

- .Plan (from old repo)
- CONTRIBUTING.md
- Any AI-generated config files
