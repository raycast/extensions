import { PropsWithChildren } from "react";
import { useValidateRequirements } from "../utils/useValidateRequirements";
import { Icon, List } from "@raycast/api";

export const ValidateRequirements: React.FunctionComponent<PropsWithChildren> = (props) => {
  const { loading, check, error } = useValidateRequirements();

  if (loading) {
    return <List isLoading />;
  }

  if (!check) {
    return (
      <List>
        <List.EmptyView title={error} icon={Icon.Plug} />
      </List>
    );
  }

  return props.children;
};
