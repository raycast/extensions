import { Form } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ForwardedRef, forwardRef, useState } from "react";

import { autocompleteIssueLinks } from "../api/issues";

type FormParentDropdownProps = {
  autocompleteUrl: string;
  epicsOnly: boolean;
  projectId: string;
} & Form.ItemProps<string>;

const FormParentDropdown = forwardRef(
  ({ autocompleteUrl, projectId, epicsOnly, ...rest }: FormParentDropdownProps, ref: ForwardedRef<Form.Dropdown>) => {
    const [query, setQuery] = useState("");

    const { data: issues, isLoading: isLoadingIssues } = useCachedPromise(
      async (query, epicsOnly) => {
        const result = await autocompleteIssueLinks(autocompleteUrl, {
          currentProjectId: projectId,
          showSubTasks: "false",
          currentJQL: epicsOnly ? "issuetype = Epic" : "issuetype != Epic",
          query,
        });

        if (result && result.sections.length > 1) {
          // Retrieve from Current Search
          return result.sections[1].issues;
        } else if (result && result.sections.length > 0) {
          // Retrieve from History Search
          return result.sections[0].issues;
        }
      },
      [query, epicsOnly],
      { keepPreviousData: true },
    );

    return (
      <Form.Dropdown
        ref={ref}
        title={epicsOnly ? "Epic" : "Parent"}
        isLoading={isLoadingIssues}
        throttle
        onSearchTextChange={setQuery}
        {...rest}
      >
        {epicsOnly ? <Form.Dropdown.Item title="No Epic" value="" /> : null}

        {issues?.map((issue) => {
          return <Form.Dropdown.Item key={issue.id} value={issue.key} title={`${issue.key}: ${issue.summaryText}`} />;
        })}
      </Form.Dropdown>
    );
  },
);

export default FormParentDropdown;
