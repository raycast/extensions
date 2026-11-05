import { Form } from "@raycast/api";
import { ForwardedRef, forwardRef, useState } from "react";

import { getSprints } from "../api/sprints";
import { useJiraCachedPromise } from "../hooks/useJiraCache";

type FormSprintDropdownProps = Form.Dropdown.Props & {
  name: string;
};

const FormSprintDropdown = forwardRef((props: FormSprintDropdownProps, ref: ForwardedRef<Form.Dropdown>) => {
  // For some reasons, Jira doesn't return all the sprint values
  // if there are not any fieldValue given, so let's use sprint as default query
  const [query, setQuery] = useState("sprint");

  const { data: sprints, isLoading } = useJiraCachedPromise(
    async (query) => getSprints({ fieldName: props.name, fieldValue: query }),
    [query],
  );

  return (
    <Form.Dropdown ref={ref} {...props} isLoading={isLoading} onSearchTextChange={setQuery} throttle filtering>
      <Form.Dropdown.Item title="No Sprint" value="" />

      {sprints?.map((sprint) => {
        return <Form.Dropdown.Item key={sprint.id} title={`${sprint.name} (${sprint.state})`} value={`${sprint.id}`} />;
      })}
    </Form.Dropdown>
  );
});

export default FormSprintDropdown;
