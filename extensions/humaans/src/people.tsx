import { ActionPanel, List, Action, Icon } from "@raycast/api";
import get from "lodash/get";
import { ENDPOINTS } from "./enums";
import { useHumaansApi } from "./hooks";
import { getFullName, getJobRole } from "./utils";
import { Person } from "./types";

export default function Command() {
  const { data: jobRoles = [], isLoading: isJobRolesLoading } = useHumaansApi(ENDPOINTS.JOB_ROLES, {
    isList: true,
    shouldShowToast: false,
  });
  const { data: people = [], isLoading: isPeopleLoading } = useHumaansApi(ENDPOINTS.PEOPLE, {
    isList: true,
    shouldShowToast: true,
  });

  const filteredPeople = people.filter(({ status }: Person) => status === "active");

  const sortedPeople = filteredPeople.sort((a: Person, b: Person) =>
    get(a, "lastName", "").localeCompare(get(b, "lastName", ""))
  );

  return (
    <List isLoading={isJobRolesLoading || isPeopleLoading}>
      {sortedPeople.length ? (
        sortedPeople.map(({ id, profilePhoto, firstName, lastName, preferredName, email, phoneNumber }: Person) => {
          const { jobTitle, department } = getJobRole(jobRoles, id);

          return (
            <List.Item
              key={id}
              icon={profilePhoto?.variants["96"] || Icon.Person}
              title={getFullName(preferredName ?? firstName, lastName)}
              subtitle={jobTitle ?? ""}
              accessories={[
                {
                  text: department ?? "",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://app.humaans.io/people?profile=${id}`} />
                  {email && (
                    <Action.CopyToClipboard
                      title="Copy Email"
                      content={email}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                  )}
                  {phoneNumber && (
                    <Action.CopyToClipboard
                      title="Copy Phone Number"
                      content={phoneNumber}
                      shortcut={{ modifiers: ["cmd"], key: "p" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })
      ) : (
        <List.EmptyView icon={Icon.Person} title="No People" />
      )}
    </List>
  );
}
