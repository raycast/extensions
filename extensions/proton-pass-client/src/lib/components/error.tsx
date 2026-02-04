import { Icon, List } from "@raycast/api";

export const ErrorView = () => {
  return (
    <List.EmptyView
      title="Error loading vaults"
      description="Make sure to have the Proton Pass CLI installed"
      icon={Icon.ExclamationMark}
    />
  );
};
