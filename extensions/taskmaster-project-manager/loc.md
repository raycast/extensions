# TaskMaster Raycast Extension – Code Refactoring Plan

## Summary
Comprehensive plan to reduce codebase from **4,846** lines to approximately **4,076–3,656** lines (**16–25 %** reduction) through strategic refactoring while maintaining all functionality.

## Key Findings
- **Major Duplication**: Status/priority configs repeated in 6+ files (~200 lines)  
- **Component Similarity**: 3 different task-item components with 80 % shared logic (~200 lines)  
- **ActionPanel Repetition**: Identical copy/navigation patterns across commands (~150 lines)  
- **Hook Redundancy**: Similar error handling and data processing (~100 lines)

## Implementation Strategy (6 Phases)

### Phase 1: Configuration Centralization (LOW RISK)
- Extract repeated `STATUS_CONFIG`, `PRIORITY_CONFIG` to `src/lib/constants.ts`  
- **Reduction**: 180–220 lines  
- **Dependencies**: None

### Phase 2: Common Components Library (LOW RISK)
- Create reusable components: `TaskStatusBadge`, `CopyActionsSubmenu`, `NavigationActions`  
- **Reduction**: 200–300 lines  
- **Dependencies**: Phase 1

### Phase 3: Hook Consolidation (MEDIUM RISK)
- Unify error-handling patterns in `useTaskMaster.ts`  
- **Reduction**: 80–120 lines  
- **Dependencies**: None

### Phase 4: Base Task Item Component (MEDIUM RISK)
- Replace 3 similar task components with one flexible `BaseTaskItem`  
- **Reduction**: 150–200 lines  
- **Dependencies**: Phases 1–2

### Phase 5: Action Panel Abstraction (MEDIUM RISK)
- Create `StandardTaskActions` component for repeated patterns  
- **Reduction**: 100–150 lines  
- **Dependencies**: Phases 1–2

### Phase 6: Utility Consolidation (LOW RISK)
- Extract common filtering, sorting, and formatting logic  
- **Reduction**: 60–100 lines  
- **Dependencies**: None

## Quality Assurance
- Zero functional regression guaranteed  
- All TypeScript compilation maintained  
- Raycast extension standards preserved  
- Improved maintainability and type safety  

**Total Expected Reduction**: 770–1,190 lines (**16–25 % less code**)