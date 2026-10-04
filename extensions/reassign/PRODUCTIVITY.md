# Command layout

| Command       | Behavior                                                                  |
| ------------- | ------------------------------------------------------------------------- |
| Agenda        | Today by default; remembers the user's day/week choice                    |
| Add Block     | Capture an idea or schedule a block, with optional Reassign AI assistance |
| Inbox         | Schedule or remove saved ideas                                            |
| Search Blocks | Direct search from Raycast root, with an optional query argument          |
| Now           | Glance, join, check off, and launch Agenda to sign in                     |

Existing command identifiers remain stable; `search` is the new entry point.
Detailed edits, moves and check-off actions stay inside Agenda.

Add Block and Edit Details show the essential fields first. Optional details can
be expanded and collapsed without losing values. Recurrence scope remains visible
on edits. Add Block uses native Start and End date-time pickers. Duration appears only when
one or both times are missing; with both filled, the preview shows the calculated
length. Date-only picker values are detected with `Form.DatePicker.isFullDay` and
remain in Inbox;
duration-only scheduling proposes concrete times for confirmation. It chooses its
primary action from the current form and dismisses
a successfully saved draft; failed saves keep the form open.

Fill with AI uses Reassign's `/api/v1/command` with `apply: false`. The user reviews
one new scheduled or Inbox block, accepts it into the editable form, and saves
through the usual event/Inbox endpoint. No Raycast AI subscription or separate AI
key is needed. Multi-block operations, existing-block changes, recurrence and
other fields this form cannot preserve are refused with guidance to use Reassign.

Reference: [Raycast command naming and store guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store).
