import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import React, { useEffect, useState } from "react";
import { useChatGo } from "./hooks/useChatGo";
import { HOST } from "./service";
import { UserInfo } from "./type";

export default function Mine() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [balance, setBalance] = useState<any | null>(null);
  const [isLoading, setLoading] = useState(true);
  const { isLoading: isLoadingMD, data: dataMD } = useFetch(
    "https://raw.githubusercontent.com/chuyun/chatgo-raycast/main/README.md"
  );
  const { isLoading: isLoadingMD_ZH, data: dataMD_ZH } = useFetch(
    "https://raw.githubusercontent.com/chuyun/chatgo-raycast/main/README-cn.md"
  );

  const chatGo = useChatGo();

  useEffect(() => {
    Promise.all([chatGo.getAccountBalance(), chatGo.getMemberInfo()])
      .then(([res1, res]) => {
        if (res1?.data.code === "000000") {
          setBalance(res1.data.data);
        }

        if (res.data.code === "000000") {
          setUserInfo(res.data.data);
        } else {
          throw new Error(res.data.msg || "get member info fail");
        }
      })
      .catch((err) => {
        showToast({
          style: Toast.Style.Failure,
          title: typeof err === "string" ? err : err?.message ?? "get member info fail",
        }).then();
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const getActionPanel = () => {
    return (
      <ActionPanel>
        <Action.OpenInBrowser title={"Go to the ChatGo Website"} url={HOST} />
        <Action.OpenInBrowser title={"Go to the Discard Group"} url={"https://discord.gg/BQWU9fePM2"} />
        <Action.OpenInBrowser title={"Go to the Plugin Homepage"} url={"https://www.raycast.com/DDDDesign/chatgo"} />
      </ActionPanel>
    );
  };

  return (
    <List isLoading={isLoading} isShowingDetail>
      <List.Section title="Mine">
        <List.Item
          title="Account Info"
          actions={getActionPanel()}
          detail={
            <List.Item.Detail
              markdown={undefined}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="UserId"
                    text={"#" + (userInfo?.userId || "UNKNOWN").toString()}
                  />
                  <List.Item.Detail.Metadata.Label title="Email" text={userInfo?.email} />
                  <List.Item.Detail.Metadata.Label title="Level" text={(balance?.level ?? "UNKNOWN").toString()} />
                  <List.Item.Detail.Metadata.Label
                    title="Balance"
                    text={"🦴 " + (balance?.token_balance ?? "UNKNOWN").toString()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="CreateTime"
                    text={new Date(userInfo?.createTime ?? 0).toLocaleDateString()}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link
                    title="HomePage"
                    target="https://www.raycast.com/DDDDesign/chatgo"
                    text="HomePage"
                  />
                  <List.Item.Detail.Metadata.Link title="OfficialSite" target={HOST} text="ChatGo.pro" />
                  <List.Item.Detail.Metadata.Link
                    title="Discord"
                    target="https://discord.gg/BQWU9fePM2"
                    text="Discord"
                  />
                  <List.Item.Detail.Metadata.Label title="" />
                  <List.Item.Detail.Metadata.Label title="" />
                  <List.Item.Detail.Metadata.Label title="" text="Powered by J with ❤️" />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      </List.Section>
      <List.Section title="Help Center">
        <List.Item
          title="Introduction"
          actions={getActionPanel()}
          detail={
            <List.Item.Detail
              markdown={
                "# Chinese Introduction\n\n" +
                (isLoadingMD_ZH ? "Loading..." : (dataMD_ZH as string)) +
                "\n\n\n\n" +
                "# English Introduction\n\n" +
                (isLoadingMD ? "Loading..." : (dataMD as string))
              }
            />
          }
        />
      </List.Section>
    </List>
  );
}
