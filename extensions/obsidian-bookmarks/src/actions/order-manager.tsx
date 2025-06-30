import { Action, ActionPanel, Image } from "@raycast/api";

export interface ActionGroup<T extends string> {
  key: string;
  actions: Map<T, Action.Props>;
  useDivider: "always" | "never" | "unless-first";
  title?: string;
  icon?: Image.ImageLike;
}

function bringKeyToFront<K extends string, V>(map: Map<K, V>, key?: K): Map<K, V> {
  if (!key) return map;
  const val = map.get(key);
  if (!val) return map;
  return new Map([[key, val], ...map]);
}

type OrderedActionGroupProps<P extends string> = {
  index: number;
  group: ActionGroup<P>;
};
function OrderedActionGroup<P extends string>({ group, index }: OrderedActionGroupProps<P>): JSX.Element {
  const actionList = [...group.actions];
  const actions = actionList.map(([key, action]) => <Action key={key} icon={group.icon} {...action} />);

  if (group.useDivider === "always" || (group.useDivider === "unless-first" && index !== 0)) {
    return <ActionPanel.Section title={group.title}>{actions}</ActionPanel.Section>;
  } else {
    return <>{actions}</>;
  }
}

type OrderedActionPanelProps<P extends string> = {
  title?: string;
  groups: ActionGroup<P>[];
  defaultAction?: P;
};
export function OrderedActionPanel<P extends string>({
  title,
  groups,
  defaultAction,
}: OrderedActionPanelProps<P>): JSX.Element {
  let orderedGroups: ActionGroup<P>[];

  if (!defaultAction) {
    orderedGroups = groups;
  } else {
    const firstIndex = groups.findIndex((group) => group.actions.has(defaultAction));
    if (firstIndex === -1) {
      orderedGroups = groups;
    } else {
      const copy = [...groups];
      const [removed] = copy.splice(firstIndex, 1);
      const first = { ...removed };
      first.actions = bringKeyToFront(first.actions, defaultAction);
      orderedGroups = [first, ...copy];
    }
  }

  return (
    <ActionPanel title={title}>
      {orderedGroups.map((group, index) => (
        <OrderedActionGroup key={group.key} group={group} index={index} />
      ))}
    </ActionPanel>
  );
}
