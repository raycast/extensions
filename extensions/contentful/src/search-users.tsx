import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { CONTENTFUL } from "./lib/contentful";
import { Action, ActionPanel, Color, Icon, LaunchProps, List } from "@raycast/api";
import { CONTENTFUL_LINKS, CONTENTFUL_SPACE } from "./lib/config";
import { useState } from "react";
import OpenInContentful from "./lib/components/open-in-contentful";

export default function SearchUsers(props: LaunchProps<{ arguments: Arguments.SearchUsers }>) {
  const { type } = props.arguments;
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const { isLoading: isLoadingUsers, data: users } = useCachedPromise(
    async () => {
      const response = await CONTENTFUL.user.getManyForSpace({ spaceId: CONTENTFUL_SPACE });
      return response.items;
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
      execute: type === "user",
    },
  );
  const { isLoading: isLoadingRoles, data: roles } = useCachedPromise(
    async () => {
      const response = await CONTENTFUL.role.getMany({ spaceId: CONTENTFUL_SPACE });
      return response.items;
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
      execute: type === "role",
    },
  );

  return (
    <List
      isLoading={isLoadingUsers || isLoadingRoles}
      searchBarPlaceholder={`Search ${type}`}
      isShowingDetail={isShowingDetail}
    >
      {type === "user"
        ? users.map((user) => (
            <List.Item
              key={user.sys.id}
              icon={user.avatarUrl}
              title={`${user.firstName} ${user.lastName}`}
              subtitle={user.email}
              accessories={[
                { date: new Date(user.sys.updatedAt), tooltip: `Updated: ${user.sys.updatedAt}` },
                { tag: { value: "2FA", color: user["2faEnabled"] ? Color.Green : Color.Red } },
              ]}
              actions={
                <ActionPanel>
                  <OpenInContentful url={CONTENTFUL_LINKS.users} />
                </ActionPanel>
              }
            />
          ))
        : roles.map((role) => (
            <List.Item
              key={role.sys.id}
              icon={getAvatarIcon(role.name)}
              title={role.name}
              subtitle={isShowingDetail ? undefined : role.description}
              accessories={
                isShowingDetail
                  ? undefined
                  : [{ date: new Date(role.sys.updatedAt), tooltip: `Updated: ${role.sys.updatedAt}` }]
              }
              detail={
                <List.Item.Detail
                  markdown={`## Policies

| effect | actions | constraint |
|--------|---------|------------|
${role.policies.map((policy) => `| ${policy.effect} | ${policy.actions} | ${JSON.stringify(policy.constraint)}`)}
`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Permissions" />
                      {Object.entries(role.permissions).map(([permission, vals]) => {
                        const tags = Array.isArray(vals) ? vals : [vals];
                        return tags.map((tag) => (
                          <List.Item.Detail.Metadata.TagList key={permission} title={permission}>
                            <List.Item.Detail.Metadata.TagList.Item text={tag} />
                          </List.Item.Detail.Metadata.TagList>
                        ));
                      })}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <OpenInContentful url={CONTENTFUL_LINKS.roles} />
                  <Action
                    icon={Icon.AppWindowSidebarLeft}
                    title="Toggle Details"
                    onAction={() => setIsShowingDetail((prev) => !prev)}
                  />
                </ActionPanel>
              }
            />
          ))}
    </List>
  );
}
