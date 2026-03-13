import { Form, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ForwardedRef, forwardRef, useState } from "react";

import { getJiraCredentials } from "../api/jiraCredentials";
import { autocomplete } from "../api/request";
import { User } from "../api/users";
import { getUserAvatar } from "../helpers/avatars";

type FormUserDropdownProps = {
  autocompleteUrl?: string;
} & Form.ItemProps<string>;

const FormUserDropdown = forwardRef(
  ({ autocompleteUrl, ...formProps }: FormUserDropdownProps, ref: ForwardedRef<Form.Dropdown>) => {
    const { myself } = getJiraCredentials();

    const [query, setQuery] = useState("");

    const { data: users, isLoading: isLoadingUsers } = useCachedPromise(
      async (autocompleteUrl, query) => {
        if (!autocompleteUrl) {
          return Promise.resolve([]);
        }

        return autocomplete(autocompleteUrl, {
          query,
        }) as Promise<User[]>;
      },
      [autocompleteUrl, query],
      { keepPreviousData: true },
    );

    return (
      <Form.Dropdown
        ref={ref}
        {...formProps}
        isLoading={isLoadingUsers}
        onSearchTextChange={setQuery}
        storeValue
        throttle
        filtering
      >
        <Form.Dropdown.Item title="Unassigned" value="" icon={Icon.Person} />

        {users?.map((user) => {
          const title = user.accountId === myself.accountId ? `${user.displayName} (me)` : user.displayName;

          return (
            <Form.Dropdown.Item key={user.accountId} value={user.accountId} title={title} icon={getUserAvatar(user)} />
          );
        })}
      </Form.Dropdown>
    );
  },
);

export default FormUserDropdown;
