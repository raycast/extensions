import { Action, ActionPanel, Color, Icon } from "@raycast/api";

export type SortActionProps = Partial<{
  sortQuery: string;
  setSortQuery: (value: string) => void;
}>;

type SortActionDataProps = { data: { title: string; value: string }[] } & SortActionProps;

export const SortAction = ({ sortQuery, setSortQuery, data }: SortActionDataProps) =>
  sortQuery && setSortQuery ? (
    <ActionPanel.Submenu title={"Sort By"} icon={Icon.ArrowUp} shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}>
      {data.map(({ title, value }) => (
        <Action
          key={value}
          title={title}
          icon={sortQuery === value ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
          onAction={() => setSortQuery(value)}
        />
      ))}
    </ActionPanel.Submenu>
  ) : (
    <></>
  );
