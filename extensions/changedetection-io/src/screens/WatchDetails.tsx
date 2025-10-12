import { Detail, Icon } from "@raycast/api";
import { useApi } from "@/api";
import { WatchDetails as WatchDetailsType } from "@/types";

const WatchDetails = ({ id }: { id: string }) => {
  const { isLoading, data } = useApi<WatchDetailsType>(`watch/${id}`);
  const markdown = !data ? "" : `${data.title ?? ""} \n\n ${data.url}`;
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Check Count" text={data.check_count.toString()} />
            <Detail.Metadata.Label title="Date Created" text={new Date(data.date_created * 1000).toString()} />
            <Detail.Metadata.Label
              title="Last Viewed"
              text={data.last_viewed ? new Date(data.last_viewed * 1000).toString() : "N/A"}
            />
            <Detail.Metadata.Label title="Method" text={data.method} />
            <Detail.Metadata.Label title="Notification Alert Count" text={data.notification_alert_count.toString()} />
            <Detail.Metadata.Label title="Paused" icon={data.paused ? Icon.Check : Icon.Xmark} />
            <Detail.Metadata.Label
              title="Processor"
              text={
                data.processor === "restock_diff"
                  ? "Re-stock & Price detection for single product pages"
                  : "Webpage Text/HTML, JSON and PDF changes"
              }
            />
            <Detail.Metadata.Label title="Sort Text Alphabetically" icon={data.paused ? Icon.Check : Icon.Xmark} />
          </Detail.Metadata>
        )
      }
    />
  );
};

export default WatchDetails;
