import { Action, ActionPanel, Color, Form, Icon, List, useNavigation } from "@raycast/api";
import { useFetch, useForm, FormValidation, showFailureToast } from "@raycast/utils";
import { useState } from "react";
import fetch from "node-fetch";

import { baseUrl, currentLocale, encodedApiKey, siteUrl } from "./utils";
import { formatShortDate } from "./scripts";
import {
  Affiliate,
  AffiliateApiResponse,
  CreateAffiliateFormValues,
  AffiliateFormProps,
  ErrorResponse,
  PaginationResult,
} from "./types";

export default function Command() {
  const [isShowingDetail, setIsShowingDetail] = useState(false);

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
    <List isLoading={isLoading} pagination={pagination} isShowingDetail={isShowingDetail}>
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
                  icon={
                    item.state === "active"
                      ? { source: Icon.Checkmark, tintColor: Color.Green }
                      : { source: Icon.Xmark }
                  }
                  subtitle={
                    !isShowingDetail
                      ? `Visitors: ${item.visitors.toLocaleString(currentLocale)}, Leads: ${item.leads.toLocaleString(currentLocale)}, Conversions: ${item.conversions.toLocaleString(currentLocale)}`
                      : ""
                  }
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="View">
                        {!isShowingDetail && (
                          <Action
                            title="Show Details"
                            icon={{ source: Icon.Info }}
                            onAction={() => setIsShowingDetail(true)}
                          />
                        )}
                        {isShowingDetail && (
                          <Action
                            title="Hide Details"
                            icon={{ source: Icon.Info }}
                            onAction={() => setIsShowingDetail(false)}
                          />
                        )}
                        <Action.OpenInBrowser
                          title="View in Rewardful"
                          shortcut={{ modifiers: ["cmd"], key: "o" }}
                          url={`${siteUrl}/affiliates/${item.id}`}
                        />
                      </ActionPanel.Section>
                      {item.paypal_email || item.wise_email ? (
                        <ActionPanel.Section title="Payout">
                          {item.paypal_email && (
                            <>
                              <Action.OpenInBrowser
                                title="Open PayPal Payment Page"
                                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                                url="https://www.paypal.com/myaccount/transfer/homepage/pay"
                              />
                              <Action.Paste
                                title="Paste PayPal Email"
                                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                                content={item.paypal_email}
                              />
                            </>
                          )}
                          {item.wise_email && (
                            <>
                              <Action.OpenInBrowser
                                title="Open Wise Payment Page"
                                shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                                url="https://wise.com/send"
                              />
                              <Action.Paste
                                title="Paste Wise Email"
                                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                                content={item.wise_email}
                              />
                            </>
                          )}
                        </ActionPanel.Section>
                      ) : null}
                      <ActionPanel.Section title="Actions">
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
                      </ActionPanel.Section>
                      <Action
                        title="Refresh"
                        icon={Icon.Repeat}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={() => revalidate()}
                      />
                    </ActionPanel>
                  }
                  {...(isShowingDetail && {
                    detail: (
                      <List.Item.Detail
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Visitors" text={item.visitors.toString()} />
                            <List.Item.Detail.Metadata.Label title="Leads" text={item.leads.toString()} />
                            <List.Item.Detail.Metadata.Label title="Conversions" text={item.conversions.toString()} />
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="Email" text={item.email} />
                            {item.paypal_email && (
                              <List.Item.Detail.Metadata.Label title="PayPal Email" text={item.paypal_email} />
                            )}
                            {item.wise_email && (
                              <List.Item.Detail.Metadata.Label title="Wise Email" text={item.wise_email} />
                            )}
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="Created" text={formatShortDate(item.created_at)} />
                            <List.Item.Detail.Metadata.Label title="Updated" text={formatShortDate(item.updated_at)} />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    ),
                  })}
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
