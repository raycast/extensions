# Adding a New Integration

## Checklist

1. Add enum value to `NotificationSourceKind` in `src/notification.ts`
2. Create integration directory structure
3. Create `types.ts`
4. Create list item component
5. Create preview component
6. Wire up in `src/index.tsx`

## Step 1: Add to NotificationSourceKind

```ts
// src/notification.ts
export enum NotificationSourceKind {
  Github = "Github",
  Todoist = "Todoist",
  Linear = "Linear",
  GoogleMail = "GoogleMail",
  Slack = "Slack",
  MyNew = "MyNew",   // add here
}
```

## Step 2: Directory structure

```bash
mkdir -p src/integrations/mynew/{listitem,preview}
```

## Step 3: types.ts

```ts
// src/integrations/mynew/types.ts
import { ThirdPartyItem } from "../../third_party_item";

export interface MyNewNotification {
  // integration-specific fields from source_item.content
}
```

## Step 4: List item component

```tsx
// src/integrations/mynew/listitem/MyNewNotificationListItem.tsx
import { List } from "@raycast/api";
import { NotificationListItemProps } from "../../../notification";
import { NotificationActions } from "../../../action/NotificationActions";
import { MyNewPreview } from "../preview/MyNewPreview";

export function MyNewNotificationListItem({ notification, mutate }: NotificationListItemProps) {
  return (
    <List.Item
      title={notification.title}
      subtitle="subtitle"
      accessories={[]}
      actions={
        <NotificationActions
          notification={notification}
          detailsTarget={<MyNewPreview notification={notification} />}
          mutate={mutate}
        />
      }
    />
  );
}
```

## Step 5: Preview component

```tsx
// src/integrations/mynew/preview/MyNewPreview.tsx
import { Detail } from "@raycast/api";
import { Notification } from "../../../notification";

interface MyNewPreviewProps {
  notification: Notification;
}

export function MyNewPreview({ notification }: MyNewPreviewProps) {
  return <Detail markdown={`# ${notification.title}`} />;
}
```

## Step 6: Wire up in index.tsx

```tsx
// src/index.tsx — two places

// In NotificationListItem switch:
case NotificationSourceKind.MyNew:
  return <MyNewNotificationListItem notification={notification} mutate={mutate} />;

// In NotificationKindDropdown:
<List.Dropdown.Item key="MyNew" title="My New" value="MyNew" />
```

## Reference Implementation

Most complete example: `src/integrations/linear/` — has subtypes (Issue, Project), accessories, and rich previews.

Simplest example: `src/integrations/todoist/` — minimal, single list item type.
