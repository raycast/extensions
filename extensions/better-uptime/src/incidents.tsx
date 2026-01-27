import { Action, ActionPanel, Color, getPreferenceValues, List, useNavigation } from "@raycast/api";
import { ActionCopyScreenshotUrl, ActionDeleteIncident } from "./actions";
import { IncidentItem, Preferences, IncidentsResponse } from "./interface";
import { useFetch } from "@raycast/utils";
import { baseUrl, incidentStatusMap } from "./constants";
import AddIncidentCommand from "./add-incident";
import { formatDateTime, getIncidentDuration } from "./utils";

export default function IncidentsCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();

  const {
    isLoading: isLoadingUnresolvedIncidents,
    data: unresolvedIncidents,
    revalidate: revalidateUnresolvedIncidents,
    pagination: unresolvedPagination,
  } = useFetch<IncidentsResponse, undefined, IncidentItem[]>(
    (options) => `${baseUrl}/incidents?resolved=false&page=${options.page + 1}`,
    {
      headers: { Authorization: `Bearer ${preferences.apiKey}` },
      mapResult(result) {
        return {
          data: result.data,
          hasMore: !!result.pagination.next,
        };
      },
      keepPreviousData: true,
    },
  );

  const {
    isLoading: isLoadingResolvedIncidents,
    data: resolvedIncidents,
    revalidate: revalidateResolvedIncidents,
    pagination: resolvedPagination,
  } = useFetch<IncidentsResponse, undefined, IncidentItem[]>(
    (options) => `${baseUrl}/incidents?resolved=true&page=${options.page + 1}`,
    {
      headers: { Authorization: `Bearer ${preferences.apiKey}` },
      mapResult(result) {
        return {
          data: result.data,
          hasMore: !!result.pagination.next,
        };
      },
      keepPreviousData: true,
    },
  );

  const pagination = unresolvedPagination?.hasMore
    ? unresolvedPagination
    : resolvedPagination?.hasMore
      ? resolvedPagination
      : undefined;

  const isLoading = isLoadingResolvedIncidents || isLoadingUnresolvedIncidents;

  if (!isLoading && !unresolvedIncidents?.length && !resolvedIncidents?.length) {
    return (
      <List
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action title="Add Incident" onAction={() => push(<AddIncidentCommand />)} />
          </ActionPanel>
        }
      >
        <List.EmptyView title="No Incidents" description="You can add an incident using the 'Add Incident' command." />
      </List>
    );
  }

  return (
    <List isShowingDetail isLoading={isLoading} pagination={pagination}>
      {!!unresolvedIncidents?.length && (
        <List.Section title="Unresolved">
          {unresolvedIncidents?.map((item) => (
            <Incident key={item.id} item={item} onDeleted={revalidateUnresolvedIncidents} />
          ))}
        </List.Section>
      )}
      {!!resolvedIncidents?.length && (
        <List.Section title="Resolved">
          {resolvedIncidents?.map((item) => (
            <Incident key={item.id} item={item} onDeleted={revalidateResolvedIncidents} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function Incident({ item, onDeleted }: { item: IncidentItem; onDeleted: () => void }) {
  return (
    <List.Item
      icon={incidentStatusMap[item.attributes.status] || incidentStatusMap.Unconfirmed}
      title={item.attributes.name}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="General"
                text={{
                  color: Color.SecondaryText,
                  value: `ID: ${item.id}`,
                }}
              />
              <List.Item.Detail.Metadata.Label title="Name" text={item.attributes.name} />
              <List.Item.Detail.Metadata.Label title="Cause" text={item.attributes.cause} />
              <List.Item.Detail.Metadata.Label title="Status" text={item.attributes.status} />

              {item.attributes.url && (
                <List.Item.Detail.Metadata.Link title="URL" text={item.attributes.url} target={item.attributes.url} />
              )}

              {item.attributes.http_method && (
                <List.Item.Detail.Metadata.Label title="HTTP Method" text={item.attributes.http_method.toUpperCase()} />
              )}

              {item.attributes.regions && item.attributes.regions.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Regions">
                  {item.attributes.regions.map((region) => (
                    <List.Item.Detail.Metadata.TagList.Item key={region} text={region.toUpperCase()} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label title="Timeline" />
              <List.Item.Detail.Metadata.Label title="Started At" text={formatDateTime(item.attributes.started_at)} />
              <List.Item.Detail.Metadata.Label title="Duration" text={getIncidentDuration(item)} />

              {item.attributes.acknowledged_at && (
                <>
                  <List.Item.Detail.Metadata.Label
                    title="Acknowledged At"
                    text={formatDateTime(item.attributes.acknowledged_at)}
                  />
                  {item.attributes.acknowledged_by && (
                    <List.Item.Detail.Metadata.Label title="Acknowledged By" text={item.attributes.acknowledged_by} />
                  )}
                </>
              )}

              {item.attributes.resolved_at && (
                <>
                  <List.Item.Detail.Metadata.Label
                    title="Resolved At"
                    text={formatDateTime(item.attributes.resolved_at)}
                  />
                  {item.attributes.resolved_by && (
                    <List.Item.Detail.Metadata.Label title="Resolved By" text={item.attributes.resolved_by} />
                  )}
                </>
              )}

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label title="Notifications" />
              <List.Item.Detail.Metadata.Label title="Call" text={item.attributes.call ? "Yes" : "No"} />
              <List.Item.Detail.Metadata.Label title="SMS" text={item.attributes.sms ? "Yes" : "No"} />
              <List.Item.Detail.Metadata.Label title="Email" text={item.attributes.email ? "Yes" : "No"} />
              <List.Item.Detail.Metadata.Label title="Push" text={item.attributes.push ? "Yes" : "No"} />

              {(item.attributes.screenshot_url || item.attributes.response_url || item.attributes.origin_url) && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Resources" />

                  {item.attributes.screenshot_url && (
                    <List.Item.Detail.Metadata.Link
                      title="Screenshot"
                      text="View Screenshot"
                      target={item.attributes.screenshot_url}
                    />
                  )}

                  {item.attributes.response_url && (
                    <List.Item.Detail.Metadata.Link
                      title="Response Body"
                      text="View Response"
                      target={item.attributes.response_url}
                    />
                  )}

                  {item.attributes.origin_url && (
                    <List.Item.Detail.Metadata.Link
                      title="Origin"
                      text="View Origin"
                      target={item.attributes.origin_url}
                    />
                  )}
                </>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {item.attributes.url && <Action.OpenInBrowser title="Open URL in Browser" url={item.attributes.url} />}
          {item.attributes.screenshot_url && (
            <>
              <Action.OpenInBrowser title="Open Screenshot in Browser" url={item.attributes.screenshot_url} />
              <ActionCopyScreenshotUrl url={item.attributes.screenshot_url} />
            </>
          )}
          {item.attributes.response_url && (
            <Action.OpenInBrowser title="View Response Body" url={item.attributes.response_url} />
          )}
          <ActionDeleteIncident item={item} onDeleted={onDeleted} />
        </ActionPanel>
      }
    />
  );
}
