import { ActionPanel, Action, Form, popToRoot, Icon } from "@raycast/api";
import { useState } from "react";
import { createRoutingRule } from "./utils/api";
import { CreateRoutingRequest } from "./utils/types";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";
import ErrorComponent from "./components/ErrorComponent";
import { EMAIL_REGEX } from "./utils/constants";
import { useDomains } from "./utils/hooks";

export default function CreateRoutingRule() {
  const [isLoading, setIsLoading] = useState(true);
  const { isLoading: isLoadingDomains, data: domains, error } = useDomains({ includeShared: true });

  const description = () => {
    const { domainName, matchUser, targetAddresses, type } = itemProps;
    const targets = targetAddresses.value && targetAddresses.value.replaceAll(" ", "").replaceAll(",", " AND ");

    let from = "FROM: ";
    if (type.value === "any") {
      from += `ANY ADDRESS i.e. '*@${domainName.value}'`;
    } else if (type.value === "exact") {
      from += `EXACT ADDRESS '${matchUser.value || "<MATCH>"}@${domainName.value}'`;
    } else if (type.value === "prefix") {
      from += `ANY ADDRESS STARTING WITH '${matchUser.value || "<MATCH>"}' i.e. '${matchUser.value || "<MATCH>"}*@${
        domainName.value
      }'`;
    } else {
      from += `ANY ADDRESS EXCEPT VALID ADDRESS i.e. <any>@${domainName.value}`;
    }

    const to = `

TO: '${targets || "<TARGETS>"}'`;
    return from + to;
  };

  type CreateRoutingFormValues = {
    domainName: string;
    type: string;
    matchUser: string;
    targetAddresses: string;
  };
  const { handleSubmit, itemProps } = useForm<CreateRoutingFormValues>({
    async onSubmit(values) {
      setIsLoading(true);

      let prefix: boolean;
      let catchall: boolean;
      let matchUser: string;

      if (values.type === "catchall") {
        prefix = true;
        catchall = true;
        matchUser = "";
      } else if (values.type === "any") {
        prefix = true;
        catchall = false;
        matchUser = "";
      } else if (values.type === "exact") {
        prefix = false;
        catchall = false;
        matchUser = values.matchUser;
      } else {
        prefix = true;
        catchall = false;
        matchUser = values.matchUser;
      }

      const formData: CreateRoutingRequest = {
        domainName: values.domainName,
        prefix,
        matchUser,
        targetAddresses: values.targetAddresses.replaceAll(" ", "").split(","),
        catchall,
      };
      const response = await createRoutingRule(formData);

      if (response.type === "success") {
        await popToRoot({
          clearSearchBar: true,
        });
      }
      setIsLoading(false);
    },
    validation: {
      domainName: FormValidation.Required,
      matchUser(value) {
        if (itemProps.type.value === "prefix" || itemProps.type.value === "exact")
          if (!value) return "The item is required";
      },
      targetAddresses(value) {
        if (!value) return "The item is required";
        else if (
          value
            .replaceAll(" ", "")
            .split(",")
            .some((email) => {
              if (!EMAIL_REGEX.test(email)) return true;
            })
        )
          return "The item is invalid";
      },
    },
  });

  return error ? (
    <ErrorComponent error={error.message} />
  ) : (
    <Form
      isLoading={isLoading || isLoadingDomains}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Routing Rule" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Domain" {...itemProps.domainName}>
        {domains
          ?.filter((domain) => !domain.isShared)
          .map((domain) => (
            <Form.Dropdown.Item
              key={domain.name}
              value={domain.name}
              title={domain.name}
              icon={getFavicon(`https://${domain.name}`)}
            />
          ))}
      </Form.Dropdown>

      <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item title="Any address" value="any" />
        <Form.Dropdown.Item title="Any address except valid user addresses (catchall)" value="catchall" />
        <Form.Dropdown.Item title="Any address starting with" value="prefix" />
        <Form.Dropdown.Item title="The exact address" value="exact" />
      </Form.Dropdown>

      {(itemProps.type.value === "prefix" || itemProps.type.value === "exact") && (
        <>
          <Form.TextField
            title="Match User"
            placeholder="hi"
            info={`The local part of the user address to be matched, i.e. "user" in "user@domain.org"`}
            {...itemProps.matchUser}
          />
          <Form.Description text={`${itemProps.matchUser.value || "<MATCH>"}@${itemProps.domainName.value}`} />
        </>
      )}

      <Form.TextField
        title="Target Addresses"
        placeholder="hi@example.local, webmaster@example.local"
        info="List of full email addresses that this mail will be rerouted to"
        {...itemProps.targetAddresses}
      />

      <Form.Description text={description()} />
    </Form>
  );
}
