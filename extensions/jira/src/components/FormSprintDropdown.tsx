import { Form } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ForwardedRef, forwardRef, useState } from "react";

import { getSprints } from "../api/sprints";

type FormSprintDropdownProps = Form.Dropdown.Props & {
  name: string;
};

const FormSprintDropdown = forwardRef((props: FormSprintDropdownProps, ref: ForwardedRef<Form.Dropdown>) => {
  // For some reasons, Jira doesn't return all the sprint values
  // if there are not any fieldValue given, so let's use sprint as default query
  const defaultQueryValue = "sprint";
  const [query, setQuery] = useState(defaultQueryValue);

  const { data: sprints, isLoading } = useCachedPromise(
    async (query) => getSprints({ fieldName: props.name, fieldValue: query }),
    [query],
  );

  const NoSprint = <Form.Dropdown.Item title="No Sprint" value="" />;

  return (
    <Form.Dropdown ref={ref} {...props} isLoading={isLoading} onSearchTextChange={setQuery} throttle>
      {query === defaultQueryValue && NoSprint}
      {sprints?.map((sprint) => (
        <Form.Dropdown.Item key={sprint.id} title={`${sprint.name} (${sprint.state})`} value={`${sprint.id}`} />
      ))}
      {query !== defaultQueryValue && NoSprint}
    </Form.Dropdown>
  );
});

export default FormSprintDropdown;
