import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import React from "react";
import { useChatGo } from "../hooks/useChatGo";
import { TemplateBase, TemplateModel } from "../type";
import { TemplateForm } from "./template/form";

export const TemplateListItem = ({
  item,
  getData,
  type,
  prefix = "X",
  myFavoriteTplList = [],
}: {
  item: TemplateBase;
  getData: () => void;
  type: 1 | 2 | 3;
  prefix: string;
  myFavoriteTplList?: TemplateModel[];
}) => {
  const chatGo = useChatGo();
  const { push } = useNavigation();

  const Add2FavoriteAction = () => (
    <Action
      icon={Icon.Star}
      title="Add to Favorite"
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
  );

  const getActionPanel = () => {
    switch (type) {
      case 1:
      case 3:
        return (
          <>
            {myFavoriteTplList.every((j) => j.template_id !== item.id) && Add2FavoriteAction()}
            <Action
              icon={Icon.Repeat}
              title={"Clone to My Template"}
              onAction={() => {
                chatGo
                  .clone2MyTemplate(item.id)
                  .then((res) => {
                    if (res.data.code === "000000") {
                      showToast({
                        style: Toast.Style.Success,
                        title: "Clone to my template success",
                      }).then();
                      getData();
                    } else {
                      throw new Error(res.data.msg);
                    }
                  })
                  .catch((err) => {
                    showToast({
                      style: Toast.Style.Success,
                      title: "Clone to my template fail",
                      message: typeof err === "string" ? err : err?.message ?? "",
                    }).then();
                    getData();
                  });
              }}
            />
          </>
        );
      case 2:
        return (
          <>
            {myFavoriteTplList.every((j) => j.template_id !== item.id) && Add2FavoriteAction()}
            <Action
              icon={Icon.Brush}
              title="Edit My Template"
              onAction={() => {
                push(<TemplateForm initValues={item} callback={getData} />);
              }}
            />
            <Action
              icon={Icon.DeleteDocument}
              title="Delete My Template"
              onAction={() => {
                chatGo
                  .deleteMyTemplate(item.id)
                  .then((res) => {
                    if (res.data.code === "000000") {
                      showToast({
                        style: Toast.Style.Success,
                        title: `Delete my template: ${item.name} success`,
                      }).then();
                      getData();
                    } else {
                      throw new Error(res.data.msg);
                    }
                  })
                  .catch((err) => {
                    showToast({
                      style: Toast.Style.Success,
                      title: "Delete my template fail",
                      message: typeof err === "string" ? err : err?.message ?? "",
                    }).then();
                    getData();
                  });
              }}
            />
          </>
        );
    }
  };

  return (
    <List.Item
      title={item.name}
      keywords={[item.name, item.id.toString(), ...item.tags]}
      id={item.id.toString() + item.name + prefix}
      key={item.id + prefix}
      icon={item.avatar || getAvatarIcon(item.name)}
      accessories={[
        myFavoriteTplList.some((j) => j.template_id === item.id) ? { icon: Icon.Star } : {},
        prefix === "O" || prefix === "C" ? { text: " 🔥 " + `${item.hot_index > 999 ? "999+" : item.hot_index}` } : {},
      ]}
      detail={
        <List.Item.Detail
          markdown={`**${item.name}**\n\n\n\n **Description:**\n\n${item.description} \n\n\n **Content:** \n\n${item.content}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Tags">
                {(item.tags.length ? item.tags : ["UNKNOWN"]).map((tag) => (
                  <List.Item.Detail.Metadata.TagList.Item text={tag} color={Color.Blue} />
                ))}
              </List.Item.Detail.Metadata.TagList>
              {(prefix === "O" || prefix === "C") && (
                <List.Item.Detail.Metadata.Label title="HotIndex" text={item.hot_index.toString()} />
              )}
              <List.Item.Detail.Metadata.Label
                title="Favorite"
                icon={myFavoriteTplList.some((j) => j.template_id === item.id) ? Icon.Checkmark : Icon.XMarkCircle}
              />
              <List.Item.Detail.Metadata.Label title="Public" icon={item.is_pub ? Icon.Checkmark : Icon.XMarkCircle} />
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
          {getActionPanel()}
          <Action
            icon={Icon.NewDocument}
            title={"Create My Own Template"}
            onAction={() => {
              push(<TemplateForm callback={getData} />);
            }}
          />
        </ActionPanel>
      }
    />
  );
};
