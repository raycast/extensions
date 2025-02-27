import { List } from "@raycast/api";
import { Environment } from "../../types";
import { useEnvContext } from "../../hooks";

export function ListContainer({ children, ...listProps }: any) {
  const { setEnvironment } = useEnvContext();
  return (
    <List
      {...listProps}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Environment"
          storeValue
          onChange={(newValue) => {
            setEnvironment(newValue as Environment);
          }}
        >
          <List.Dropdown.Item title="Live" value="live" />
          <List.Dropdown.Item title="Test" value="test" />
        </List.Dropdown>
      }
    >
      {children}
    </List>
  );
}
