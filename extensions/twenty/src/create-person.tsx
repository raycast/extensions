import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import axios, { isAxiosError } from "axios";
import { useState } from "react";
import { useAuthHeaders } from "./hooks/use-auth-headers";
import { useGetCompanies } from "./hooks/use-company";
import ListPeople from "./list-people";
import { Person } from "./types";
import ErrorView from "./error-view";
import { useApiUrl } from "./hooks/use-api-url";

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

  const { handleSubmit, itemProps } = useForm<CreatePersonFormProps>({
    async onSubmit(values) {
      if (!isLoading || !creationIsLoading) {
        setCreationIsLoading(true);

        const newPerson = await createPerson(values);

        if ("error" in newPerson) {
          setCreationIsLoading(false);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to Create Person",
            message: newPerson.error.message,
          });
          return;
        }

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

  if (error) {
    return <ErrorView error={error} />;
  }

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
      <Form.TextField title="First Name" placeholder="Enter first name" {...itemProps.firstName} />
      <Form.TextField title="Last Name" placeholder="Enter last name" {...itemProps.lastName} />
      <Form.TextField title="Email Address" placeholder="Enter email address" {...itemProps.primaryEmail} />
      <Form.Separator />
      <Form.TextField title="Phone Number" placeholder="Enter phone number" {...itemProps.primaryPhoneNumber} />
      <Form.TextField title="Job Title" placeholder="Enter job title" {...itemProps.jobTitle} />
      <Form.TextField title="City" placeholder="Enter city" {...itemProps.city} />
      <Form.Dropdown
        title="Company"
        isLoading={isLoading}
        {...itemProps.companyId}
        onChange={(newValue) => {
          if (newValue === "load-more") {
            loadMore();
          }
        }}
      >
        <Form.Dropdown.Item title="Empty" key="empty" value="" />
        {companies.map((company) => (
          <Form.Dropdown.Item title={company.name} key={company.id} value={company.id} />
        ))}
        {hasMore ? <Form.Dropdown.Item title="Load More" key="load-more" value="load-more" /> : null}
      </Form.Dropdown>
    </Form>
  );
}

const createPerson = async (
  values: CreatePersonFormProps,
): Promise<{ data: Person } | { error: { message: string } }> => {
  try {
    const response = await axios.post<Person>(
      useApiUrl("people"),
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
        ...(values.companyId!.length ? { companyId: values } : {}),
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

      return {
        data: response.data,
      };
    } else {
      return {
        error: {
          message: "An unexpected error occurred",
        },
      };
    }
  } catch (error) {
    console.log(error);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to Create Person",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    });

    if (isAxiosError(error)) {
      return {
        error: {
          message: error.response?.data.message ?? "An unexpected error occurred",
        },
      };
    } else {
      return {
        error: {
          message: "An unexpected error occurred",
        },
      };
    }
  }
};
