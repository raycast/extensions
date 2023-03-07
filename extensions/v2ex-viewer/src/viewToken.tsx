import { List, Icon, Detail } from "@raycast/api";
import dayjs, { getUnixFromNow } from "@/utils/time";
import { useFetch } from "@raycast/utils";
import { getToken } from "@/utils/preference";
import { Response, Notification, Token } from "@/types/v2ex";
import { showLoadingToast, showFailedToast, showSuccessfulToast } from "./utils/toast";

const getDetail = (text: string) => {
  const regex = text.includes("›")
    ? /(?<behavior>[^ ]+) › <a[^<>]+?>(?<topicTitle>[^<>]+)/gm
    : /[^>]+?>(?<topicTitle>[^<>]+)<\/a> \W(?<behavior>[^<>]+)/gm;
  const match = regex.exec(text);
  try {
    return match?.groups;
  } catch (error) {
    return null;
  }
};

export default function Command() {
  const token = getToken();
  const tokenDetail = useFetch<Response<Token>>("https://www.v2ex.com/api/v2/token", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    execute: !!token,
    keepPreviousData: true,
    onWillExecute: () => {
      showLoadingToast({ message: "/topics" });
    },
    onError: (error) => {
      showFailedToast({ message: error.message || "" });
    },
    onData: (data) => {
      showSuccessfulToast({ message: data.message || "" });
    },
  });

  return (
    <Detail
      markdown={token}
      // navigationTitle="Pikachu"
      metadata={
        tokenDetail.data?.result && (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Scope">
              <Detail.Metadata.TagList.Item
                text={tokenDetail.data.result.scope as unknown as string}
                color={"#eed535"}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Last used" text={getUnixFromNow(tokenDetail.data.result.last_used)} />
            <Detail.Metadata.Label title="Total used" text={String(tokenDetail.data.result.total_used) + " times"} />

            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Created"
              text={dayjs(tokenDetail.data.result.created * 1000).format("YYYY-MM-DD HH:mm:ss")}
            />
            <Detail.Metadata.Label title="Good for days" text={tokenDetail.data.result.good_for_days + " days"} />
            <Detail.Metadata.Label
              title="Expiration"
              text={dayjs(tokenDetail.data.result.created * 1000 + tokenDetail.data.result.expiration * 1000).format(
                "YYYY-MM-DD HH:mm:ss"
              )}
            />
          </Detail.Metadata>
        )
      }
    />
  );
}
