# Select Language Command — Design Spec

**Date:** 2026-03-19
**Status:** Approved

## Overview

Add a `Select Language` command to the Raycast Handy extension, allowing users to change the transcription language when the active model supports it. Follows the same pattern as the existing `Select Model` command.

## Behavior

1. User opens "Select Language" from Raycast.
2. Extension reads `selected_model` and `selected_language` from Handy's settings file.
   - If `selected_language` is missing from the JSON, default to `"auto"`.
3. Looks up the model in `MODEL_REGISTRY`:
   - **`supportsLanguageSelection: false`** → show error toast ("Model X does not support language selection") and close. No list shown.
   - **`supportsLanguageSelection: true`** → show filtered `List` view.
   - **`selected_model` is `""` or unknown/custom** → treated as supporting all Whisper languages (safe fallback, matching Rust behavior). Title shows "Active model: Unknown".
4. List shows "Auto (detect)" as first item, followed by languages filtered to `supportedLanguages` for the active model.
   - If `supportedLanguages` is `undefined`, all Whisper languages are shown (no filter).
   - If the filtered list is unexpectedly empty, show `<List.EmptyView title="No languages available" />`.
5. Active language is marked with a `✓` checkmark accessory.
6. On selection → `writeSettings({ selected_language: code })` + `showHUD("Language set to X")` (matches `select-model` pattern; HUD auto-dismisses the window).

## Files

### Modified

- **`src/lib/models.ts`**
  Add to `ModelInfo`:
  ```ts
  supportsLanguageSelection: boolean;
  supportedLanguages?: string[]; // undefined = all Whisper languages
  ```
  Populate for each model in `MODEL_REGISTRY`.

- **`src/lib/settings.ts`**
  Add `selected_language: string` to `HandySettings` interface.

### Created

- **`src/lib/languages.ts`**
  Map of `code → { label: string; native: string }` for all Whisper languages (~99) plus SenseVoice-specific codes (`yue`, `zh-Hans`, `zh-Hant`). The `"auto"` entry uses `{ label: "Auto (detect)", native: "Auto (detect)" }`. Display format in UI: `"Italiano · Italian"` (native · English label); for `"auto"` just `"Auto (detect)"`.

- **`src/select-language.tsx`**
  List view command. Reads settings + model registry, handles unsupported model case, renders language list with active indicator.

## Model Language Support

| Model | supportsLanguageSelection | supportedLanguages |
|---|---|---|
| Whisper Small/Medium/Turbo/Large | true | undefined (all Whisper) |
| Breeze ASR | true | undefined (all Whisper) |
| SenseVoice | true | `zh`, `zh-Hans`, `zh-Hant`, `en`, `yue`, `ja`, `ko` |
| Canary 180M Flash | true | `en`, `de`, `es`, `fr` |
| Canary 1B v2 | true | `bg`, `hr`, `cs`, `da`, `nl`, `en`, `et`, `fi`, `fr`, `de`, `el`, `hu`, `it`, `lv`, `lt`, `mt`, `pl`, `pt`, `ro`, `sk`, `sl`, `es`, `sv`, `ru`, `uk` |
| Parakeet V2/V3 | false | — |
| Moonshine Base/V2 Tiny/Small/Medium | false | — |
| GigaAM v3 | false | — |

## package.json command entry

```json
{
  "name": "select-language",
  "title": "Select Language",
  "subtitle": "Handy",
  "description": "Set the transcription language for the active model",
  "mode": "view"
}
```

## Error Handling

- Settings file unreadable → propagate existing `readSettings()` error (caught by Raycast).
- `selected_language` missing from JSON → default to `"auto"`.
- `selected_model` is `""` → treat as custom model, show all Whisper languages.
- Model not found in registry → fallback to all Whisper languages (custom model assumption).
- `supportedLanguages` array is present but empty → show `<List.EmptyView title="No languages available" />`.
- Language written but Handy not running → write succeeds silently; Handy picks it up on next launch.
