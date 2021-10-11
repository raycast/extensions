---
description: This example shows how to show a RSS feed as a List.
---

# Hacker news

{% hint style="info" %}
The source code of the example can be found [here](../../examples/hacker-news). You can install it [here](https://www.raycast.com/thomas/hacker-news).
{% endhint %}

![Read Frontpage of Hacker News](<../.gitbook/assets/Frame 18.png>)

```tsx
function StoryListItem(props: { item: Parser.Item; index: number }) {
  const icon = getIcon(props.index + 1);
  const points = getPoints(props.item);
  const comments = getComments(props.item);

  return (
    <List.Item
      icon={icon}
      title={props.item.title ?? "No title"}
      subtitle={props.item.creator}
      accessoryTitle={`👍  ${points}    💬  ${comments}`}
      actions={<Actions item={props.item} />}
    />
  );
}
```
