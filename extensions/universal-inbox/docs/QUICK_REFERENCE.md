# Quick Reference

## Session Start Checklist

- [ ] Load `CLAUDE.md`
- [ ] Load `.claude/COMMON_MISTAKES.md`
- [ ] Load `.claude/QUICK_START.md`
- [ ] Load `.claude/ARCHITECTURE_MAP.md`
- [ ] Load task-specific doc from `docs/learnings/`

## Key Commands

```bash
ray develop          # dev + hot reload
ray build -e dist    # production build
ray lint --fix       # lint + autofix
prettier --write src # format
```

## Core Code Patterns

### API call from action
```ts
import fetch from "node-fetch";  // NOT global fetch
import { handleErrors } from "../api";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<UniversalInboxPreferences>();
const baseUrl = preferences.universalInboxBaseUrl.replace(/\/$/, "");

await mutate(
  handleErrors(
    fetch(`${baseUrl}/api/notifications/${notification.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: NotificationStatus.Deleted }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${preferences.apiKey}`,
      },
    }),
  ),
  {
    optimisticUpdate(page) {
      if (page) page.content = page.content.filter((n) => n.id !== notification.id);
      return page;
    },
  },
);
```

### Toast pattern
```ts
const toast = await showToast({ style: Toast.Style.Animated, title: "Doing thing" });
try {
  // ... action ...
  toast.style = Toast.Style.Success;
  toast.title = "Done";
} catch (error) {
  toast.style = Toast.Style.Failure;
  toast.title = "Failed";
  toast.message = (error as Error).message;
  throw error;
}
```

### New list item component signature
```ts
export function <Name>NotificationListItem({ notification, mutate }: NotificationListItemProps) {
  // ...
}
```

## File Locations — Cheat Sheet

| What | Where |
|------|-------|
| Main entry | `src/index.tsx` |
| Notification types | `src/notification.ts` |
| Task types | `src/task.ts` |
| Third-party item types | `src/third_party_item.ts` |
| Preferences type | `src/types.ts` |
| Error handling | `src/api.ts` |
| All actions | `src/action/` |
| GitHub components | `src/integrations/github/` |
| Linear components | `src/integrations/linear/` |
| Slack components | `src/integrations/slack/` |
| Google Mail components | `src/integrations/google-mail/` |
| Todoist components | `src/integrations/todoist/` |

## Debugging Quick Tips

| Symptom | Check |
|---------|-------|
| 401 errors | API key in Raycast preferences |
| UI not updating after action | `optimisticUpdate` in `mutate()` call |
| Type error on new integration | Add to `NotificationSourceKind` enum |
| Extension won't load | TypeScript errors in `ray develop` output |
| Trailing-slash 404s | `.replace(/\/$/, "")` on `universalInboxBaseUrl` |
