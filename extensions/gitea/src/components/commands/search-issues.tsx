import { Action, ActionPanel, getPreferenceValues, Icon, Image, List } from "@raycast/api";
import { UseSearchInput, useSearchIssues } from "../../api";
import React, { useState } from "react";
import { OrganizationDropdown } from "../dropdowns/organization-dropdown";

export type DefaultSearchIssuesProps = Pick<UseSearchInput, "type" | "assigned" | "reviewRequested"> & {
  defaultState: UseSearchInput["state"];
};

export function SearchIssues({ type, defaultState, assigned, ...rest }: DefaultSearchIssuesProps & List.Props) {
  const preferences = getPreferenceValues();
  const url = preferences.url;

  const [state, setState] = useState(defaultState);
  const [owner, setOwner] = useState("");

  const { data, isLoading } = useSearchIssues({
    type,
    state,
    owner,
    assigned,
  });

  const filterActions = (
    <>
      {state !== "open" && (
        <Action
          title="Filter State Open"
          icon={Icon.Filter}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => {
            setState("open");
          }}
        />
      )}
      {state !== "closed" && (
        <Action
          title="Filter State Closed"
          icon={Icon.Filter}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
          onAction={() => {
            setState("closed");
          }}
        />
      )}
      {state !== "all" && (
        <Action
          title="Filter State All"
          icon={Icon.Filter}
          shortcut={{ modifiers: ["cmd"], key: "x" }}
          onAction={() => {
            setState("all");
          }}
        />
      )}
    </>
  );

  return (
    <List
      {...rest}
      searchBarAccessory={<OrganizationDropdown all value={owner} onChange={(org) => setOwner(org)} />}
      isLoading={isLoading}
      actions={<ActionPanel>{filterActions}</ActionPanel>}
    >
      {data &&
        data.map((item) => {
          const color = item.state === "open" ? "#87ab63" : "#cc4848";

          let icon: Image.ImageLike =
            item.state === "open"
              ? { source: "open.svg", tintColor: color }
              : { source: "closed.svg", tintColor: color };

          if (item.pull_request) {
            icon = { source: "unmerged.svg", tintColor: color };

            if (item.pull_request.merged) {
              icon = { source: "merged.svg", tintColor: "#b259d0" };
            }
          }

          return (
            <List.Item
              key={item.id}
              icon={icon}
              title={item.title}
              subtitle={item.repository.full_name}
              accessories={[item.milestone ? { icon: Icon.Flag, text: item.milestone.title } : {}]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open" url={item.html_url} />
                  <Action.OpenInBrowser title="Open Repository" url={`${url}/${item.repository.full_name}`} />
                  {filterActions}
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
