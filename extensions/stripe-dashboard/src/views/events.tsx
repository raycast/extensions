import React from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import get from "lodash/get";
import omit from "lodash/omit";
import snakeCase from "lodash/snakeCase";
import { useStripeApi, useStripeDashboard } from "../hooks";
import { convertTimestampToDate, titleCase, resolveMetadataValue } from "../utils";
import { ENDPOINTS } from "../enums";
import { withPropsContext } from "../components";

type EventResp = {
  id: string;
  created: number;
  type: string;
  data: {
    object: {
      id: string;
      created: number;
      metadata: any;
    }
  };
};

type Event = {
  id: string;
  created_at: string;
  type: string;
};

const omittedFields = ["data_client_secret", "data_receipt_url"];

const resolvedMetadata = (metadata: any) =>
  Object.keys(metadata).reduce((acc, key) => {
    const value = metadata[key];
    return { ...acc, [`metadata_${snakeCase(key)}`]: value };
  }, {});

const resolvedData = (data: any) =>
  Object.keys(data).reduce((acc, key) => {
    const value = data[key];

    if (key === "metadata") {
      return { ...acc, ...resolvedMetadata(value) };
    }

    return { ...acc, [`data_${snakeCase(key)}`]: value };
  }, {});

const resolveEvent = ({ created, data, ...rest }: EventResp): Event => {
  return {
    ...rest,
    ...(resolvedData(data.object) as any),
    created_at: convertTimestampToDate(created),
  };
};

const Events = () => {
  const { isLoading, data: resp } = useStripeApi(ENDPOINTS.EVENTS);
  const { dashboardUrl } = useStripeDashboard();
  const eventsResp = get(resp, "data", []) as EventResp[];
  const formattedEvents = eventsResp.map(resolveEvent);

  const renderEvents = (event: Event) => {
    const { type, id } = event;
    const fields = omit(event, omittedFields);

    return (
      <List.Item
        key={id}
        title={type}
        icon={{ source: Icon.Network, tintColor: Color.Orange }}
        actions={
          <ActionPanel title="Actions">
            <Action.OpenInBrowser
              title="Open in Stripe Dashboard"
              url={`${dashboardUrl}/events/${id}`}
            />
            <Action.CopyToClipboard title="Copy Event ID" content={id} />
            <Action.CopyToClipboard title="Copy Event Type" content={type} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Metadata" />
                <List.Item.Detail.Metadata.Separator />
                {Object.entries(fields).map(([type, value]) => {
                  const resolvedValue = resolveMetadataValue(value);
                  if (!resolvedValue) return null;

                  return <List.Item.Detail.Metadata.Label key={type} title={titleCase(type)} text={resolvedValue} />;
                })}
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} isShowingDetail={!isLoading}>
      <List.Section title="Events">{formattedEvents.map(renderEvents)}</List.Section>
    </List>
  );
};

export default withPropsContext(Events);
