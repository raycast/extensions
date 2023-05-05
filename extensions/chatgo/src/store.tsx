import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import React, { useCallback, useEffect, useState } from "react";
import { uniqBy } from "lodash";
import { useChatGo } from "./hooks/useChatGo";
import { TemplateBase, TemplateModel } from "./type";
import { getAvatarIcon } from "@raycast/utils";
import Ask from "./ask";

export default function Store() {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [myTPlList, setMyTPlList] = useState<TemplateModel[]>([]);
  const [list, setList] = useState<TemplateBase[]>([]);
  const chatGo = useChatGo();
  const { push } = useNavigation();

  const uniqMyTplList = uniqBy(myTPlList, "id");
  const uniqList = uniqBy(list, "id");
  const uniqListWithoutMyList = uniqList.filter((i) => uniqMyTplList.every((j) => j.template_id !== i.id));

  useEffect(() => {
    getData();
  }, []);

  const getData = useCallback(() => {
    setLoading(true);
    Promise.all([chatGo.getMyTemplateList(true), chatGo.getPromptTemplates({ name: "", tag: "" })])
      .then(([myList, response2]) => {
        setMyTPlList(myList || []);
        if (response2) {
          const { data: list } = response2;
          if (list.code === "000000") {
            setList(list.data || []);
          }
        }
        setLoading(false);
      })
      .catch();
  }, [setLoading, setMyTPlList, setList]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle={false}
      isShowingDetail={myTPlList.length > 0 || list.length > 0}
      // searchBarPlaceholder="Search answer/question..."
    >
      {myTPlList.length === 0 && list.length === 0 && (
        <List.EmptyView title="No Data" description="Your recent questions will be showed up here" icon={Icon.Stars} />
      )}
      <List.Section title={"My Template"} subtitle={uniqBy(myTPlList, "id").length.toLocaleString()}>
        {uniqMyTplList.map((item) => {
          return (
            <List.Item
              title={item.template_name}
              id={item.id.toString() + item.template_name + "F"}
              key={item.id}
              icon={item.avatar || getAvatarIcon(item.template_name)}
              accessories={[{ text: new Date(item.create_time ?? 0).toLocaleDateString() }]}
              detail={<List.Item.Detail markdown={`**${item.template_name}**\n\n\n\n ${item.content}`} />}
              actions={
                <ActionPanel>
                  {item.template_name !== "万能助手" && (
                    <Action
                      icon={Icon.StarDisabled}
                      title="Remove the Template From My Templates"
                      onAction={() => {
                        chatGo.removeMyTemplate(item.id).then(() => {
                          getData();
                        });
                      }}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title={"Template Store"} subtitle={uniqBy(list, "id").length.toLocaleString()}>
        {uniqListWithoutMyList.map((item) => {
          return (
            <List.Item
              title={item.name}
              id={item.id.toString() + item.name}
              key={item.id}
              icon={item.avatar || getAvatarIcon(item.name)}
              accessories={[{ text: new Date(item.create_time ?? 0).toLocaleDateString() }]}
              detail={
                <List.Item.Detail markdown={`**${item.name}**\n\n\n\n ${item.description} \n\n ${item.content}`} />
              }
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Star}
                    title="Add to My Template List"
                    onAction={async () => {
                      const toast = await showToast({
                        title: "Add template...",
                        style: Toast.Style.Animated,
                      });
                      chatGo
                        .addTemplateForMine(item.id)
                        .then(() => {
                          toast.title = "Add template success";
                          toast.style = Toast.Style.Success;
                          getData();
                        })
                        .catch(() => {
                          toast.title = "Add template fail";
                          toast.style = Toast.Style.Failure;
                        });
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
