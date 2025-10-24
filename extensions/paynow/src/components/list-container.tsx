import { List } from "@raycast/api";
import StoreListDropdown from "./store-list-dropdown";

export type ListContainerProps = List.Props;

const ListContainer = ({ children, ...props }: ListContainerProps) => {
  return (
    <List {...props} searchBarAccessory={<StoreListDropdown />}>
      {children}
    </List>
  );
};

export default ListContainer;
