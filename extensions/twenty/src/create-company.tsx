import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import axios from "axios";
import { useState } from "react";
import { useAuthHeaders } from "./hooks/use-auth-headers";

interface CreateCompanyFormProps {
  name: string;
  domainName: string;
  employees?: string;
  linkedinUrl?: string;
  xUrl?: string;
  annualRecurringRevenue?: string;
  currencyCode?: string;
  addressStreet1?: string;
  addressStreet2?: string;
  addressCity?: string;
  addressPostcode?: string;
  addressState?: string;
  addressCountry?: string;
  idealCustomerProfile?: boolean;
}

export default function CreateCompanyForm() {
  // const { push } = useNavigation();
  const [creationIsLoading, setCreationIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<CreateCompanyFormProps>({
    async onSubmit(values) {
      if (!creationIsLoading) {
        setCreationIsLoading(true);
        await createCompany(values);
        setCreationIsLoading(false);
      }
    },

    validation: {
      name: FormValidation.Required,
      domainName: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={creationIsLoading}
    >
      <Form.Description text="This form is to add a company in your Twenty CRM" />
      <Form.TextField title="Company Name" {...itemProps.name} />
      <Form.TextField title="Domain Name" {...itemProps.domainName} />
      <Form.Separator />

      <Form.TextField title="Number of Employees" {...itemProps.employees} />
      <Form.TextField title="LinkedIn URL" {...itemProps.linkedinUrl} />
      <Form.TextField title="X (Twitter) URL" {...itemProps.xUrl} />
      <Form.TextField title="Annual Recurring Revenue" {...itemProps.annualRecurringRevenue} />
      <Form.TextField title="Currency Code" {...itemProps.currencyCode} />
      <Form.Separator />

      <Form.TextField title="Address Street 1" {...itemProps.addressStreet1} />
      <Form.TextField title="Address Street 2" {...itemProps.addressStreet2} />
      <Form.TextField title="City" {...itemProps.addressCity} />
      <Form.TextField title="Postcode" {...itemProps.addressPostcode} />
      <Form.TextField title="State" {...itemProps.addressState} />
      <Form.TextField title="Country" {...itemProps.addressCountry} />
      <Form.Checkbox label="Ideal Customer Profile" {...itemProps.idealCustomerProfile} />
    </Form>
  );
}

const createCompany = async (values: CreateCompanyFormProps) => {
  try {
    console.log("Creating company", values);
    const response = await axios.post(
      "https://api.twenty.com/rest/companies",
      {
        name: values.name,
        domainName: {
          primaryLinkLabel: values.domainName,
          primaryLinkUrl: `https://${values.domainName}`,
        },
        employees: values.employees ? parseInt(values.employees.toString()) : undefined,
        linkedinLink: values.linkedinUrl
          ? {
              primaryLinkLabel: "LinkedIn",
              primaryLinkUrl: values.linkedinUrl,
            }
          : undefined,
        xLink: values.xUrl
          ? {
              primaryLinkLabel: "X (Twitter)",
              primaryLinkUrl: values.xUrl,
            }
          : undefined,
        annualRecurringRevenue: values.annualRecurringRevenue
          ? {
              amountMicros: parseInt(values.annualRecurringRevenue.toString()) * 1000000,
              currencyCode: values.currencyCode || "USD",
            }
          : undefined,
        address: {
          addressStreet1: values.addressStreet1,
          addressStreet2: values.addressStreet2,
          addressCity: values.addressCity,
          addressPostcode: values.addressPostcode,
          addressState: values.addressState,
          addressCountry: values.addressCountry,
        },
        idealCustomerProfile: values.idealCustomerProfile,
        position: 0,
        createdBy: { source: "API" },
      },
      {
        headers: useAuthHeaders(),
      },
    );

    if (response.status === 200 || response.status === 201) {
      showToast({
        style: Toast.Style.Success,
        title: "Company Created",
        message: `${values.name} has been created successfully`,
      });
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error creating company:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to Create Company",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
};
