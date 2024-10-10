import { Action, ActionPanel, Form, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import axios from "axios";
import { useState } from "react";
import { useAuthHeaders } from "./hooks/use-auth-headers";
import { useGetCompanies } from "./hooks/use-company";
import ListPeople from "./list-people";

interface CreatePersonFormProps {
  firstName: string;
  lastName: string;
  primaryEmail: string;
  primaryPhoneNumber?: string;
  linkedinLink?: string;
  jobTitle?: string;
  city?: string;
  companyId?: string;
}

export default function CreatePersonForm() {
  const { push } = useNavigation();
  const { companies, isLoading, error, hasMore, loadMore } = useGetCompanies();
  const [creationIsLoading, setCreationIsLoading] = useState(false);

  if (error) {
    return <List.EmptyView title="Error" description={error.message} />;
  }

  const { handleSubmit, itemProps, setValue } = useForm<CreatePersonFormProps>({
    async onSubmit(values) {
      if (!isLoading || !creationIsLoading) {
        setCreationIsLoading(true);
        await createPerson(values);
        setCreationIsLoading(false);
        push(<ListPeople />);
      }
    },

    validation: {
      firstName: FormValidation.Required,
      lastName: FormValidation.Required,
      primaryEmail: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={creationIsLoading || isLoading}
    >
      <Form.Description text="This form is to add a person in your Twenty CRM" />
      <Form.TextField title="First Name" {...itemProps.firstName} />
      <Form.TextField title="Last Name" {...itemProps.lastName} />
      <Form.TextField title="Email Address" {...itemProps.primaryEmail} />
      <Form.Separator />

      <Form.TextField title="Phone Number" {...itemProps.primaryPhoneNumber} />
      <Form.TextField title="Job Title" {...itemProps.jobTitle} />
      <Form.TextField title="City" {...itemProps.city} />
      <Form.Dropdown
        title="Company"
        isLoading={isLoading}
        {...itemProps.companyId}
        onChange={(newValue) => {
          if (newValue === "load-more") {
            loadMore();
          } else if (newValue === "no-more") {
            setValue("companyId", "");
          }
        }}
      >
        <Form.Dropdown.Item title="Empty" key="empty" value="" />
        {companies.map((company) => (
          <Form.Dropdown.Item title={company.name} key={company.id} value={company.id} />
        ))}
        {
          hasMore ? <Form.Dropdown.Item title="Load More" key="load-more" value="load-more" /> : null
          // <Form.Dropdown.Item title="No more companies" key="no-more" value="no-more" />
        }
      </Form.Dropdown>
    </Form>
  );
}

const createPerson = async (values: CreatePersonFormProps) => {
  try {
    console.log("Creating person", values);
    const response = await axios.post(
      "https://api.twenty.com/rest/people",
      {
        name: {
          firstName: values.firstName,
          lastName: values.lastName,
        },
        emails: {
          primaryEmail: values.primaryEmail,
        },
        phones: {
          primaryPhoneNumber: values.primaryPhoneNumber,
        },
        linkedinLink: {
          primaryLinkLabel: values.linkedinLink ?? "",
          primaryLinkUrl: values.linkedinLink ?? "",
        },
        jobTitle: values.jobTitle,
        city: values.city,
        companyId: values.companyId,
        position: 0,
        createdBy: { source: "API" },
        avatarUrl: `https://api.dicebear.com/9.x/notionists/svg?seed=${values.primaryEmail}`,
      },
      {
        headers: useAuthHeaders(),
      },
    );

    if (response.status === 200 || response.status === 201) {
      showToast({
        style: Toast.Style.Success,
        title: "Person Created",
        message: `${values.firstName} ${values.lastName} account created`,
      });
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error creating person:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to Create Person",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
};
