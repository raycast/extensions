import { Icon, List } from "@raycast/api";
import type { NewTransferError } from "@putdotio/api-client";

type Props = {
  errors: NewTransferError[];
};

export const TransferErrorList = ({ errors }: Props) => (
  <List>
    {errors.map((error) => (
      <List.Item
        key={error.url}
        icon={Icon.Link}
        title={error.url}
        accessories={[
          {
            text: error.error_type,
          },
        ]}
      />
    ))}
  </List>
);
