// Drops windows the helper could not read that sit on a visible Desktop (SPEC.md §6.3 step 3, applied to windows
// registered on several Desktops). Pure.
import type { WindowList } from "./protocol.ts";

/**
 * On a visible Desktop the app's Accessibility window list is complete, so a window it omits there is a surface, not
 * a user window. The helper already drops unresolved windows whose Desktops are all visible; one that is also
 * registered on a hidden Desktop slipped through and was listed as "Window (title unavailable)" with a warning
 * (observed: a 228×239 off-screen Reminders panel on Desktops 5 and 1, with Desktop 1 visible). Unresolved windows
 * only on hidden Desktops are kept: those are the other-Desktop windows the helper's remote-token scan exists for.
 * Nothing is dropped when Space data is unavailable.
 */
export function dropUnresolvedOnVisibleDesktop(list: WindowList): WindowList {
  if (!list.spaces.available) return list;
  const visible = new Set(list.spaces.visibleSpaceIds);
  const windows = list.windows.filter((w) => w.resolved || !w.spaceIds.some((id) => visible.has(id)));
  return windows.length === list.windows.length ? list : { ...list, windows };
}
