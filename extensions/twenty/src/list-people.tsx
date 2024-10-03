import { List, Image, Icon, ActionPanel, Action } from "@raycast/api";
import { useGetPeople } from "./hooks/use-people";

export default function ListPeople() {
  const { people } = useGetPeople();

  return (
    <List isShowingDetail selectedItemId="24200b57-1db3-4c48-80f1-119de6276442">
      {people.map((person) => (
        <List.Item
          key={person.id}
          title={person.name.firstName + " " + person.name.lastName}
          subtitle="Person"
          actions={
            <ActionPanel title="#1 in raycast/extensions">
              <Action icon={Icon.Trash} title="Delete Person" onAction={() => console.log("Close PR #1")} />
            </ActionPanel>
          }
          icon={{
            source: person.avatarUrl,
            mask: Image.Mask.Circle,
          }}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Full Name"
                    text={person.name.firstName + " " + person.name.lastName}
                  />
                  <List.Item.Detail.Metadata.Link
                    title="Email Address"
                    text={person.emails.primaryEmail}
                    target={person.emails.primaryEmail}
                    // icon={Icon.Envelope}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Phone Number"
                    text={person.phones.primaryPhoneCountryCode + " " + person.phones.primaryPhoneNumber}
                    icon={Icon.Phone}
                  />
                  <List.Item.Detail.Metadata.Label title="City" text={person.city ?? "Empty"} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Company" text={person.company.name} />
                  <List.Item.Detail.Metadata.Label title="Job Title" text={person.jobTitle ?? "Empty"} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Company Address"
                    text={person.company.address.addressStreet1 + ", " + person.company.address.addressCity}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
