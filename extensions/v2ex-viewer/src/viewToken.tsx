import { Icon, Detail, Action, ActionPanel } from "@raycast/api";
import dayjs, { getUnixFromNow } from "@/utils/time";
import { useCachedState, useFetch } from "@raycast/utils";
import { getToken } from "@/utils/preference";
import { Response, Token } from "@/types/v2ex";
import { showLoadingToast, showFailedToast, showSuccessfulToast } from "./utils/toast";
import { Bold, Code, Heading } from "./utils/markdown";
const getHiddenToken = (token: string) => {
  const split = token.split("-");
  split.forEach((v, i) => {
    if (i === 0 || i === split.length - 1) {
      return;
    }
    split[i] = v.replace(/./g, "*");
  });
  return split.join("-");
};

export default function Command() {
  const token = getToken();
  const hiddenToken = getHiddenToken(token);
  const [hideToken, setHideToken] = useCachedState("HIDE_TOKEN", true);
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
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Token" content={token} />
          <Action
            title={(hideToken ? "Show" : "Hide") + " Token"}
            icon={hideToken ? Icon.Eye : Icon.EyeDisabled}
            onAction={() => {
              setHideToken((v) => !v);
            }}
          />
          <Action.OpenInBrowser title="Setting Token" url={"https://v2ex.com/settings/tokens"} icon={Icon.Cog} />
        </ActionPanel>
      }
      markdown={Heading(1, Bold(Code(!hideToken ? token : hiddenToken)))}
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
