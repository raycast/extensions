import { Form } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ForwardedRef, forwardRef, useState, useMemo } from "react";

import { getSprints } from "../api/sprints";

type FormSprintDropdownProps = Form.Dropdown.Props & {
  name: string;
};

const FormSprintDropdown = forwardRef((props: FormSprintDropdownProps, ref: ForwardedRef<Form.Dropdown>) => {
  // For some reasons, Jira doesn't return all the sprint values
  // if there are not any fieldValue given, so let's use sprint as default query
  const [query, setQuery] = useState("sprint");

  const { data: sprints, isLoading } = useCachedPromise(
    async (query) => getSprints({ fieldName: props.name, fieldValue: query }),
    [query]
  );

  const formattedSprints = useMemo(
    () =>
      sprints?.map((sprint) => {
        return {
          ...sprint,
          // Strip away the possible HTML tags and the numbers at the end
          displayName: sprint.displayName.replace(/<[^>]*>/g, "").replace(/\s+\(\d+\)$/, ""),
        };
      }),
    [sprints]
  );

  return (
    <Form.Dropdown ref={ref} {...props} isLoading={isLoading} onSearchTextChange={setQuery} throttle>
      <Form.Dropdown.Item title="No Sprint" value="" />

      {formattedSprints?.map((sprint) => {
        return <Form.Dropdown.Item key={sprint.value} title={sprint.displayName} value={sprint.value} />;
      })}
    </Form.Dropdown>
  );
});

export default FormSprintDropdown;
