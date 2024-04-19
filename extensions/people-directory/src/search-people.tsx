import { Client } from "@notionhq/client";
import { Action, ActionPanel, getPreferenceValues, Icon, Image, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

type Person = {
  id: string;
  url: string;
  icon?: {
    file: {
      url: any;
    };
  };
  properties: {
    Name: {
      title: {
        plain_text: string;
      }[];
    };
    "Company email": {
      email: string;
    };
    "Start day": {
      date?: {
        start: any;
      };
    };
    "Phone number": {
      phone_number: string;
    };
    Team: {
      multi_select: {
        name: string;
      }[];
    };
  };
};

type Preferences = {
  apiToken: string;
  databaseId: string;
};

const preferences: Preferences = getPreferenceValues();
const client = new Client({ auth: preferences.apiToken });

async function fetchPeopleDirectory() {
  const response = await client.databases.query({ database_id: preferences.databaseId });
  return response.results as unknown as Person[];
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(fetchPeopleDirectory);

  return (
    <List isLoading={isLoading}>
      {data?.map((person) => (
        <List.Item
          key={person.id}
          title={person.properties.Name.title[0].plain_text}
          subtitle={person.properties["Company email"].email}
          accessories={[
            {
              icon: Icon.Person,
              text: person.properties.Team.multi_select.map((i) => i.name).join(", "),
              tooltip: `Teams: ${person.properties.Team.multi_select.map((i) => i.name).join(", ")}`,
            },
            {
              icon: Icon.Clock,
              date: person.properties["Start day"].date ? new Date(person.properties["Start day"].date?.start) : undefined,
              tooltip: `Start date: ${person.properties["Start day"].date?.start}`,
            },
            {
              icon: Icon.Phone,
              text: person.properties["Phone number"].phone_number,
              tooltip: `Phone number: ${person.properties["Phone number"].phone_number}`,
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={person.properties.Name.title[0].plain_text}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                <Action.CopyToClipboard
                  title="Copy Email"
                  content={person.properties["Company email"].email}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
                <Action.CopyToClipboard 
                title="Copy Phone Number"
                content={person.properties["Phone number"].phone_number}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t"}}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
