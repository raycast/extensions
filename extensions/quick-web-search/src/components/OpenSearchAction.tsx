import { Action, Keyboard, PopToRootType, closeMainWindow, open } from "@raycast/api";
import { Engine } from "../engines";

export function OpenSearchAction(props: {
  title: string;
  engine: Engine;
  query: string;
  onSearch: (query: string) => Promise<void>;
  shortcut?: Keyboard.Shortcut;
}) {
  const { title, engine, query, onSearch, shortcut } = props;
  return (
    <Action
      title={title}
      icon={engine.icon}
      shortcut={shortcut}
      onAction={async () => {
        await onSearch(query);
        await open(engine.searchUrl(query));
        await closeMainWindow({ popToRootType: PopToRootType.Default });
      }}
    />
  );
}
