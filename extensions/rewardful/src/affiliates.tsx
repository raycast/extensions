import { Action, ActionPanel, Form, getPreferenceValues, Icon, List, useNavigation } from "@raycast/api";
import { useFetch, useForm, FormValidation, showFailureToast } from "@raycast/utils";
import fetch from "node-fetch";

import { baseUrl, siteUrl } from "./utils";
import {
  Affiliate,
  AffiliateApiResponse,
  CreateAffiliateFormValues,
  AffiliateFormProps,
  ErrorResponse,
  PaginationResult,
  Preferences,
} from "./types";

const preferences = getPreferenceValues();
const localePref = preferences.locale || "en-us";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const encodedApiKey = btoa(`${preferences.apiKey}:`);

  const { isLoading, data, pagination, revalidate } = useFetch(
    (options) => `${baseUrl}/affiliates?expand=campaign&` + new URLSearchParams({ page: String(options.page + 1) }),
    {
      headers: { Authorization: `Basic ${encodedApiKey}` },
      initialData: {
        data: [],
        hasMore: false,
        cursor: null,
      } as PaginationResult<Affiliate>,
      keepPreviousData: true,
      mapResult(result: AffiliateApiResponse): PaginationResult<Affiliate> {
        return {
          data: result.data,
          hasMore: !!result.pagination.next_page,
          pageSize: result.pagination.limit,
        };
      },
    },
  );

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {data && data.length > 0 ? (
        <>
          {Object.entries(
            data.reduce((sections: Record<string, React.ReactNode[]>, item) => {
              const campaignName = item.campaign.name;
              if (!sections[campaignName]) {
                sections[campaignName] = [];
              }
              sections[campaignName].push(
                <List.Item
                  key={item.id}
                  title={`${item.first_name} ${item.last_name}`}
                  subtitle={`Visitors: ${item.visitors.toLocaleString(localePref)}, Leads: ${item.leads.toLocaleString(localePref)}, Conversions: ${item.conversions.toLocaleString(localePref)}`}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        title="View In Rewardful"
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                        url={`${siteUrl}/affiliates/${item.id}`}
                      />
                      <Action.Push
                        title="Create Affiliate"
                        icon={{ source: Icon.Plus }}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        target={
                          <CreateAffiliate affiliate={item} encodedApiKey={encodedApiKey} revalidate={revalidate} />
                        }
                      />
                      <Action.Push
                        title="Update Affiliate"
                        icon={{ source: Icon.Pencil }}
                        shortcut={{ modifiers: ["cmd"], key: "u" }}
                        target={
                          <UpdateAffiliate affiliate={item} encodedApiKey={encodedApiKey} revalidate={revalidate} />
                        }
                      />
                      <Action
                        title="Refresh"
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={() => revalidate()}
                      />
                    </ActionPanel>
                  }
                />,
              );
              return sections;
            }, {}),
          ).map(([title, children]) => (
            <List.Section key={title} title={title}>
              {children}
            </List.Section>
          ))}
        </>
      ) : (
        <List.EmptyView title="No data available" description="Failed to fetch data from the API." />
      )}
    </List>
  );
}

function CreateAffiliate({ affiliate, encodedApiKey, revalidate }: AffiliateFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CreateAffiliateFormValues>({
    initialValues: {
      first_name: "",
      last_name: "",
      email: "",
      campaign_id: affiliate.campaign.id,
      token: "",
      paypal_email: "",
      wise_email: "",
    },
    validation: {
      first_name: FormValidation.Required,
      last_name: FormValidation.Required,
      email: FormValidation.Required,
    },
    onSubmit: async (values) => {
      const response = await fetch(`${baseUrl}/affiliates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${encodedApiKey}`,
        },
        body: new URLSearchParams(values).toString(),
      });

      if (!response.ok) {
        const errorResponse = (await response.json()) as ErrorResponse;
        showFailureToast(errorResponse.error, { title: "Failed to create affiliate" });
        return;
      }

      revalidate();
      pop();
    },
  });

  return (
    <Form
      navigationTitle="Create Affiliate"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="First Name" {...itemProps.first_name} />
      <Form.TextField title="Last Name" {...itemProps.last_name} />
      <Form.TextField title="Email" {...itemProps.email} />
      <Form.TextField title="Campaign ID" {...itemProps.campaign_id} />
      <Form.TextField title="Token" {...itemProps.token} />
      <Form.TextField title="PayPal Email" {...itemProps.paypal_email} />
      <Form.TextField title="Wise Email" {...itemProps.wise_email} />
    </Form>
  );
}

function UpdateAffiliate({ affiliate, encodedApiKey, revalidate }: AffiliateFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CreateAffiliateFormValues>({
    initialValues: {
      first_name: affiliate.first_name,
      last_name: affiliate.last_name,
      email: affiliate.email,
      campaign_id: affiliate.campaign.id,
      paypal_email: affiliate.paypal_email,
      wise_email: affiliate.wise_email,
    },
    validation: {
      first_name: FormValidation.Required,
      last_name: FormValidation.Required,
      email: FormValidation.Required,
    },
    onSubmit: async (values) => {
      const response = await fetch(`${baseUrl}/affiliates/${affiliate.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${encodedApiKey}`,
        },
        body: new URLSearchParams(values).toString(),
      });

      if (!response.ok) {
        const errorResponse = (await response.json()) as ErrorResponse;
        showFailureToast(errorResponse.error, { title: "Failed to update affiliate" });
        return;
      }

      revalidate();
      pop();
    },
  });

  return (
    <Form
      navigationTitle="Update Affiliate"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="First Name" {...itemProps.first_name} />
      <Form.TextField title="Last Name" {...itemProps.last_name} />
      <Form.TextField title="Email" {...itemProps.email} />
      <Form.TextField title="Campaign ID" {...itemProps.campaign_id} />
      <Form.TextField title="PayPal Email" {...itemProps.paypal_email} />
      <Form.TextField title="Wise Email" {...itemProps.wise_email} />
    </Form>
  );
}
