import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { uniqBy } from "lodash";
import React, { useCallback, useEffect, useState } from "react";
import { useChatGo } from "./hooks/useChatGo";
import { TemplateBase, TemplateModel } from "./type";
import { TemplateListItem } from "./views/template-list-item";

export default function Store() {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [keywords, setKeywords] = useState<string | null>(null);
  const [myFavoriteTPlList, setMyFavoriteTPlList] = useState<TemplateModel[]>([]);
  const [officialTplList, setOfficialTplList] = useState<TemplateBase[]>([]);
  const [mineTplList, setMineTplList] = useState<TemplateBase[]>([]);
  const [communityTplList, setCommunityTplList] = useState<TemplateBase[]>([]);
  const chatGo = useChatGo();

  const uniqMyFavoriteTplList = uniqBy(myFavoriteTPlList, "id");

  useEffect(() => {
    getData();
  }, []);

  const getData = useCallback(() => {
    setLoading(true);
    Promise.all([
      chatGo.getMyTemplateList(true),
      chatGo.getPromptTemplates({ name: "", tag: "", type: 1 }),
      chatGo.getPromptTemplates({ name: "", tag: "", type: 2 }),
      chatGo.getPromptTemplates({ name: "", tag: "", type: 3 }),
    ])
      .then(([myList, response4Official, response4Mine, response4Community]) => {
        setMyFavoriteTPlList(myList || []);
        if (response4Official) {
          const { data: list } = response4Official;
          const { data: list4Mine } = response4Mine;
          const { data: list4Community } = response4Community;
          setOfficialTplList(list?.data ?? []);
          setCommunityTplList(list4Community?.data ?? []);
          setMineTplList(list4Mine?.data ?? []);
        }
        setLoading(false);
      })
      .catch();
  }, [setLoading, setMyFavoriteTPlList, setOfficialTplList, setCommunityTplList, setMineTplList]);

  const onSearchTextChange = useCallback(
    (text: string) => {
      setKeywords(text);
    },
    [setKeywords]
  );
  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle={false}
      isShowingDetail={myFavoriteTPlList.length > 0 || officialTplList.length > 0}
      searchBarPlaceholder="Search Template..."
      onSearchTextChange={onSearchTextChange}
    >
      {myFavoriteTPlList.length === 0 && officialTplList.length === 0 && (
        <List.EmptyView title="No Data" description="Your recent questions will be showed up here" icon={Icon.Stars} />
      )}
      <List.Section title={"Favorite Templates"} subtitle={uniqBy(myFavoriteTPlList, "id").length.toLocaleString()}>
        {uniqMyFavoriteTplList.map((item, index) => {
          return (
            <List.Item
              title={item.template_name}
              keywords={[item.template_name, item.id.toString()]}
              id={item.id.toString() + item.template_name + "F"}
              key={item.id}
              icon={item.avatar || getAvatarIcon(item.template_name)}
              detail={
                <List.Item.Detail
                  markdown={`**${item.template_name}**\n\n\n\n **Description:**\n\n${item.description} \n\n\n **Content:** \n\n${item.content}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {(item.tags.length ? item.tags : ["UNKNOWN"]).map((tag) => (
                          <List.Item.Detail.Metadata.TagList.Item text={tag} color={Color.Blue} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Label
                        title="CreateTime"
                        text={new Date(item.create_time ?? 0).toLocaleDateString()}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="UpdateTime"
                        text={new Date(item.update_time ?? 0).toLocaleDateString()}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {item.template_name !== "万能助手" && (
                    <>
                      {index > 1 ? (
                        <Action
                          title="Move Up"
                          icon={Icon.ArrowUp}
                          onAction={() => {
                            chatGo.moveUpMyFavoriteTPl(item.id).then(() => {
                              getData();
                            });
                          }}
                        />
                      ) : null}
                      <Action
                        icon={Icon.StarDisabled}
                        title="Remove the Favorite Template"
                        shortcut={{ modifiers: ["cmd"], key: "p" }}
                        onAction={() => {
                          chatGo.removeMyTemplate(item.id).then(() => {
                            getData();
                          });
                        }}
                      />
                    </>
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title={"My Templates"} subtitle={uniqBy(mineTplList, "id").length.toLocaleString()}>
        {uniqBy(mineTplList, "id")
          .filter((i) =>
            keywords ? i.name.includes(keywords) || i.id.toString().includes(keywords) || i.tags.includes(keywords) : i
          )
          .map((item) => {
            return (
              <TemplateListItem
                item={item}
                getData={getData}
                type={2}
                prefix={"M"}
                myFavoriteTplList={uniqMyFavoriteTplList}
              />
            );
          })}
      </List.Section>
      <List.Section title={"Official Templates"} subtitle={uniqBy(officialTplList, "id").length.toLocaleString()}>
        {uniqBy(officialTplList, "id")
          .filter((i) =>
            keywords ? i.name.includes(keywords) || i.id.toString().includes(keywords) || i.tags.includes(keywords) : i
          )
          .map((item) => {
            return (
              <TemplateListItem
                item={item}
                getData={getData}
                type={1}
                prefix="O"
                myFavoriteTplList={uniqMyFavoriteTplList}
              />
            );
          })}
      </List.Section>
      <List.Section title={"Community Templates"} subtitle={uniqBy(communityTplList, "id").length.toLocaleString()}>
        {uniqBy(communityTplList, "id")
          .filter((i) =>
            keywords ? i.name.includes(keywords) || i.id.toString().includes(keywords) || i.tags.includes(keywords) : i
          )
          .map((item) => {
            return (
              <TemplateListItem
                item={item}
                getData={getData}
                type={3}
                prefix="C"
                myFavoriteTplList={uniqMyFavoriteTplList}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
