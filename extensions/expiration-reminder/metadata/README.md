# Store Screenshots

Raycast Store listings require **at least 3** screenshots (`2000×1250`, `.png`) in
this `metadata/` folder, named `expiration-reminder-{n}.png`.

Capture these against a **test account with no real customer PII on screen**
(there is no separate sandbox — QA and captures run against production with a
clearly-labelled test tenant). Use Raycast's built-in **Window Capture** (the
"Take Screenshot" action in `ray develop`, or the Store dev tools capture):

1. `expiration-reminder-1.png` — **Show Expired Items** list with urgency accessories.
2. `expiration-reminder-2.png` — **Show About-To-Expire Items** with the window dropdown open.
3. `expiration-reminder-3.png` — **Create an Expiration** form (category + contact dropdowns).
4. `expiration-reminder-4.png` — **Search Contacts** → a contact's expirations drill-down.
5. `expiration-reminder-5.png` — shared **Detail** view with the metadata sidebar.

These are intentionally not committed yet: they must be generated from a running
build against a test tenant. Add them here before submitting to the Store.
