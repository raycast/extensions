import { Action, Color, Icon } from "@raycast/api";

export type SearchCommonActionsProps = {
  syncItems: () => void;
  lockVault: () => void;
  logoutVault: () => void;
};

const SearchCommonActions = (props: SearchCommonActionsProps) => {
  return (
    <>
      <Action
        title="Sync Vault"
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        icon={Icon.ArrowClockwise}
        onAction={props.syncItems}
      />
      <Action
        icon={{ source: "sf_symbols_lock.svg", tintColor: Color.PrimaryText }} // Does not immediately follow theme
        title="Lock Vault"
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        onAction={props.lockVault}
      />
      <Action title="Logout" icon={Icon.XMarkCircle} onAction={props.logoutVault} />
    </>
  );
};
export default SearchCommonActions;
