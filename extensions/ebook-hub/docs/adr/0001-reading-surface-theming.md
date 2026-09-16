# ADR-0001: Reading Surface Theming with Hue Moods

- Status: Accepted
- Date: 2026-09-15

## Context

Ebook Hub must ship the three Hue moods (Huế Mưa, Huế Hương, Huế Cung) and
allow custom themes. Raycast's `Detail` view renders CommonMark only: there is
no API for background, text color, font, or CSS. Text on the reading surface
always follows the user's active Raycast theme.

Raycast does support importing a full custom theme through a deeplink. The
format used by ray.so (`app/(navigation)/themes/lib/url.ts`) is:

```text
raycast://theme?author=…&authorUsername=…&version=…&name=…&appearance=dark|light
  &colors=background,backgroundSecondary,text,selection,loader,red,orange,yellow,green,blue,purple,magenta
```

## Decision

Theme in two layers:

1. **Extension accents** — Hue semantic tokens map to Raycast
   `Color.Dynamic` values (`{ light, dark }`) for icons, tags, and progress
   indicators. The light side always uses Huế Cung; the dark side uses the
   selected dark mood (Huế Mưa when Huế Cung itself is selected).
2. **Full reading surface** — the extension builds a `raycast://theme`
   deeplink per mood and exposes "Apply Hue Theme to Raycast" actions (also
   `:theme <mood>` in Command Mode). The user confirms the import in Raycast.

Token mapping:

| Raycast slot | Hue semantic role |
| --- | --- |
| background | `surface.canvas` |
| backgroundSecondary | `surface.raised` |
| text | `text.primary` |
| selection | `surface.selected` |
| loader | `accent.primary` |
| red | `status.error` |
| orange, yellow | `status.warning` |
| green | `status.success` |
| blue | `status.info` |
| purple, magenta | `status.notice` |

Hue has no distinct yellow or magenta role, so those slots reuse the nearest
role instead of inventing colors.

The tokens currently live as a snapshot in `src/theme/hue-tokens.ts`
(hue-theme tokens v0.2.0). The source of truth moves to a `raycast` adapter in
the hue-theme repository, which will generate this file.

## Consequences

- Applying a Hue theme changes all of Raycast, not only Ebook Hub. Actions and
  docs must say so.
- The deeplink format is not part of the documented Extension API and may
  change. It is isolated in `src/theme/raycast-deeplink.ts`.
- Custom themes are JSON files with the same semantic roles; they reuse the
  same deeplink builder.
- Text stays real text: selectable, accessible, and scaled by Raycast's text
  size setting.

## Alternatives Considered

- **Render pages as themed SVG/PNG images** — full color control, but loses
  text selection, accessibility, and font scaling, and costs a render per page.
  Rejected.
- **Only accent colors** — safe but does not deliver the Hue reading
  atmosphere. Kept as layer 1 only.
