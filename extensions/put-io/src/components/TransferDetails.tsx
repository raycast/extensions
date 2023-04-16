import { Fragment } from "react";
import { Icon, List } from "@raycast/api";
import PutioAPI, { Transfer } from "@putdotio/api-client";
import formatDate from "../utils/formatDate";
import formatSize from "../utils/formatSize";
import timeDifference from "../utils/timeDifference";
import changeTimezone from "../utils/changeTimezone";

function TransferDetails({ transferDetails }: { transferDetails: Transfer }) {
  const now = changeTimezone(new Date(), "UTC");
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Transfer Details" />
          <List.Item.Detail.Metadata.Separator />
          <Fragment key="name">
            <List.Item.Detail.Metadata.Label
              title="Name"
              text={transferDetails.name ? transferDetails.name : "(unknown)"}
              icon={Icon.Document}
            />
            <List.Item.Detail.Metadata.Separator />
          </Fragment>
          {(transferDetails.status == "COMPLETED" || transferDetails.status == "SEEDING") && (
            <Fragment key="finishedAt">
              <List.Item.Detail.Metadata.Label
                title="Finished"
                text={`${formatDate(new Date(String(transferDetails.finished_at)))} (${timeDifference(
                  now,
                  new Date(String(transferDetails.finished_at))
                )})`}
                icon={Icon.Calendar}
              />
              <List.Item.Detail.Metadata.Separator />
            </Fragment>
          )}
          <Fragment key="size">
            <List.Item.Detail.Metadata.Label
              title="Size"
              text={formatSize(transferDetails.size, true, 2)}
              icon={Icon.List}
            />
            <List.Item.Detail.Metadata.Separator />
          </Fragment>
          <Fragment key="status">
            <List.Item.Detail.Metadata.Label title="Status" text={`${transferDetails.status}`} icon={Icon.Checkmark} />
            <List.Item.Detail.Metadata.Separator />
          </Fragment>
          {transferDetails.status == "DOWNLOADING" && (
            <Fragment key="downloaded">
              <List.Item.Detail.Metadata.Label
                title="Downloaded"
                text={`${formatSize(transferDetails.downloaded, true, 2)}`}
                icon={Icon.Download}
              />
              <List.Item.Detail.Metadata.Separator />
            </Fragment>
          )}
          <Fragment key="tracker">
            <List.Item.Detail.Metadata.Label
              title="Tracker"
              text={`${transferDetails.tracker}`}
              icon={Icon.Binoculars}
            />
            <List.Item.Detail.Metadata.Separator />
          </Fragment>
          {transferDetails.tracker_message !== null && (
            <Fragment key="tracker_message">
              <List.Item.Detail.Metadata.Label
                title="Tracker Message"
                text={transferDetails.tracker_message}
                icon={Icon.Message}
              />
              <List.Item.Detail.Metadata.Separator />
            </Fragment>
          )}
          {(transferDetails.status == "COMPLETED" || transferDetails.status == "SEEDING") && (
            <Fragment key="ratio">
              <List.Item.Detail.Metadata.Label
                title="Ratio"
                text={`${transferDetails.current_ratio}`}
                icon={Icon.ArrowClockwise}
              />
              <List.Item.Detail.Metadata.Separator />
            </Fragment>
          )}
          {(transferDetails.status == "COMPLETED" || transferDetails.status == "SEEDING") && (
            <Fragment key="peers">
              <List.Item.Detail.Metadata.Label
                title="Peers"
                text={`${transferDetails.peers_getting_from_us} sending ${transferDetails.peers_sending_to_us} receiving`}
                icon={Icon.Person}
              />
              <List.Item.Detail.Metadata.Separator />
            </Fragment>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default TransferDetails;
