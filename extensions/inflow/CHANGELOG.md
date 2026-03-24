# InFlow Changelog

## [Initial Store Version] - {PR_MERGE_DATE}

- Refine the onboarding and user guidance process to ensure a smoother initial setup.
- Optimize app icons and presentation drafts for the Raycast Store submission.
- Update README.md.

## [Model Compatibility & Output Stability] - 2026-03-19

- Revamp system prompts and reasoning extraction logic to handle "thinking mode" across different models gracefully.
- Improve system stability and output language maintainability across various AI providers.
- Optimize pending UI presentation and image display effects during API loading.

## [Architecture Refactoring & Provider Registry] - 2026-03-16

- Consolidate core command configurations into a centralized manifest for easier scaling.
- Implement a comprehensive provider registry that unifies the interface for interacting with different AI platforms.
- Append distinctive visual icons to model provider dropdown options directly within preferences.

## [Custom UX Elements & Model Interactions] - 2026-03-14

- Introduce custom preferred language logic and custom Model ID settings to give users more granular control over AI configurations.
- Transition command and provider icons to support dynamic SVG and Raycast dark modes natively.
- Utilize system prompt caching mechanisms to reduce complexity and improve AI response speed.

## [Context Awareness & Auto-Paste Enhancements] - 2026-03-08

- Significantly improve editable area detection accuracy to boost the reliability of text extraction and automatic pasting.
- Optimize global prompt restrictions and selection logic to ensure selected input is accurately acquired across macOS applications.
- Add action to instantly clean command history and handle edge-case line breaks in selected context.

## [Panel Experience & Core Execution Loop] - 2026-03-02

- Introduce the Preview Panel iteration as a primary execution alternative to inline processing.
- Refactor timing constants and simplify verification logic for faster, more reliable text insertions.
- Add streaming generation capabilities matched with intelligent fallback mechanisms for UI stability.

## [Initial Version] - 2026-02-06

- Initial version code
- Supports silent mode translation and rewriting.