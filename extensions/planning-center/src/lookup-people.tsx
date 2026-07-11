import { Action, ActionPanel, Clipboard, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

interface Person {
  id: string;
  attributes: {
    name: string;
  };
}

interface PeopleResponse {
  data: Person[];
}

interface PhoneNumber {
  id: string;
  attributes: {
    number: string;
    primary: boolean;
  };
}

interface PhoneNumbersResponse {
  data: PhoneNumber[];
}

interface Email {
  id: string;
  attributes: {
    address: string;
    primary: boolean;
  };
}

interface EmailsResponse {
  data: Email[];
}

const API_BASE_URL = "https://api.planningcenteronline.com";

function getAuthHeader(): string {
  const { app_id, app_secret } = getPreferenceValues<Preferences>();
  const credentials = Buffer.from(`${app_id}:${app_secret}`).toString("base64");
  return `Basic ${credentials}`;
}

async function fetchPeople(query: string): Promise<Person[]> {
  const params = new URLSearchParams({
    "where[search_name_or_email_or_phone_number]": query,
    "where[status]": "active",
  });
  const url = `${API_BASE_URL}/people/v2/people?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
      "User-Agent": "Planning Center for Raycast (Mozilla/5.0)",
      "Accept-Encoding": "gzip, deflate",
    },
  });
  if (res.status === 401) {
    throw new Error("Invalid API credentials. Please check your Client ID and Secret in Raycast preferences.");
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch people: ${res.statusText}`);
  }
  const data = (await res.json()) as PeopleResponse;
  return data.data;
}

async function fetchPhone(personId: string): Promise<string> {
  const url = `${API_BASE_URL}/people/v2/people/${personId}/phone_numbers`;
  const res = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
      "User-Agent": "Planning Center for Raycast (Mozilla/5.0)",
      "Accept-Encoding": "gzip, deflate",
    },
  });
  if (!res.ok) return "N/A";
  const data = (await res.json()) as PhoneNumbersResponse;
  const phones = data.data;
  if (!phones.length) return "N/A";
  const primary = phones.find((p: PhoneNumber) => p.attributes.primary);
  return (primary || phones[0]).attributes.number || "N/A";
}

async function fetchEmail(personId: string): Promise<string> {
  const url = `${API_BASE_URL}/people/v2/people/${personId}/emails`;
  const res = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
      "User-Agent": "Planning Center for Raycast (Mozilla/5.0)",
      "Accept-Encoding": "gzip, deflate",
    },
  });
  if (!res.ok) return "N/A";
  const data = (await res.json()) as EmailsResponse;
  const emails = data.data;
  if (!emails.length) return "N/A";
  const primary = emails.find((e: Email) => e.attributes.primary);
  return (primary || emails[0]).attributes.address || "N/A";
}

export default function Command() {
  const [query, setQuery] = useState("");
  const {
    isLoading,
    data: people = [],
    error,
  } = useCachedPromise(async (query: string) => fetchPeople(query), [query]);

  let listContent = null;
  if (error) {
    listContent = <List.EmptyView title="Error" description={error.message} />;
  } else if (people.length === 0 && query) {
    listContent = <List.EmptyView title="No Results" description={`No people matching '${query}'`} />;
  } else {
    listContent = people.map((person) => (
      <List.Item
        key={person.id}
        icon={Icon.Person}
        title={person.attributes.name}
        subtitle="View in Planning Center"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={`https://people.planningcenteronline.com/people/AC${person.id}`} />
            <Action
              title="Copy Phone Number"
              onAction={async () => {
                const phone = await fetchPhone(person.id);
                await Clipboard.copy(phone);
                showToast({ style: Toast.Style.Success, title: "Copied Phone Number", message: phone });
              }}
            />
            <Action
              title="Copy Email Address"
              shortcut={{ modifiers: ["opt"], key: "enter" }}
              onAction={async () => {
                const email = await fetchEmail(person.id);
                await Clipboard.copy(email);
                showToast({ style: Toast.Style.Success, title: "Copied Email Address", message: email });
              }}
            />
          </ActionPanel>
        }
      />
    ));
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search by name, email, or phone number..."
      throttle
    >
      {listContent}
    </List>
  );
}
