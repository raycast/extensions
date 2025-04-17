# Refactoring Plan for n8n-workflows Extension

This plan outlines the steps to address feedback received on the GitHub pull request.

## 1. Understanding the Feedback & Context

The feedback covers several areas:
*   **Documentation & Metadata:** Issues with `CHANGELOG.md` date format and screenshot location/naming for the Raycast store.
*   **Code Style & Best Practices:** Suggestions to use `@raycast/utils` like `showFailureToast` and the `fetch` wrapper, implementing `isLoading` for UI lists, and improving error handling (`try-catch` for `launchCommand`).
*   **Logic & Edge Cases:** Handling potentially empty `httpMethod` and reconsidering how optional fields are defaulted in storage.
*   **Storage:** Questioning the use of `LocalStorage` vs. Preferences API for filters.
*   **Extraneous Files:** Question about the `.history` folder.

## 2. Proposed Plan

```mermaid
graph TD
    A[Start: Review Feedback] --> B{Analyze Files};
    B --> C[Create Plan];
    C --> D{Address Non-Code Issues};
    D --> D1[1. Update .gitignore];
    D --> D2[2. Fix CHANGELOG.md Date];
    D --> D3[3. Adjust Screenshots/Metadata];
    C --> E{Refactor Code};
    E --> E1[4. Use showFailureToast];
    E --> E2[5. Wrap launchCommand in try-catch];
    E --> E3[6. Implement isLoading Prop];
    E --> E4[7. Use @raycast/utils fetch];
    E --> E5[8. Handle Optional Storage Fields];
    E --> E6[9. Handle Empty httpMethod];
    E --> E7[10. Keep LocalStorage for Filters (Add Comment)];
    D1 & D2 & D3 & E1 & E2 & E3 & E4 & E5 & E6 & E7 --> F[Present Plan to User];
    F --> G{User Approval?};
    G -- Yes --> H[Offer to Save Plan to File];
    H --> I[Suggest Switch to Code Mode];
    G -- No --> C;
```

## Detailed Steps:

1.  **`.history` Folder:** Add `.history/` to `.gitignore`.
2.  **`CHANGELOG.md` Date:** Replace hardcoded date with `{PR_MERGE_DATE}`.
3.  **Metadata/Screenshots:** Rename files in `metadata/` to `1.png`, `2.png`, etc. Remove `assets/screenshots/`. Verify screenshots.
4.  **Refactor Error Handling:** Replace manual `showToast` failures and `console.error`/`throw` with `showFailureToast` in relevant utils files (`n8n-api-utils.ts`, `storage-utils.ts`, `reset-utils.ts`).
5.  **Wrap `launchCommand`:** Find `launchCommand` calls and wrap them in `try...catch` with `showFailureToast`.
6.  **Implement `isLoading`:** Add loading state management to hooks and pass `isLoading` prop to `<List>`/`<Grid>` components in command files.
7.  **Use `@raycast/utils` fetch:** Refactor `n8n-api-utils.ts` to use the utils fetch wrapper. Remove `node-fetch` dependency.
8.  **Handle Optional Storage Fields:** Modify `addSavedCommand` in `storage-utils.ts` to allow `undefined` for optional fields instead of defaulting to `""`.
9.  **Handle Empty `httpMethod`:** Update `getWebhookDetails` in `workflow-utils.ts` to handle empty/whitespace `httpMethod`.
10. **Storage for Filters:** Keep using `LocalStorage` for filters and add a comment explaining the rationale.