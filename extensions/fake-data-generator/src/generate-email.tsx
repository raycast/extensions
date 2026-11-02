import { Color, Icon } from "@raycast/api";
import { RecordField, RecordList } from "./components/RecordList";
import { emailVariants, isReservedDomain, Profile } from "./lib/people";
import { preferences, useEmailDomainWarning } from "./preferences";

interface Emails {
  name: string;
  emails: { label: string; value: string }[];
}

function create(profile: Profile): Emails {
  const sex = profile.faker.person.sex() as "female" | "male";
  const first = profile.faker.person.firstName(sex);
  const last = profile.faker.person.lastName(sex);
  return { name: `${first} ${last}`, emails: emailVariants(first, last, preferences().emailDomain) };
}

function fields(e: Emails): RecordField[] {
  return e.emails.map((email) => ({
    id: email.label,
    section: `Emails for ${e.name}`,
    title: email.label,
    value: email.value,
    icon: Icon.Envelope,
    copyTitle: "Copy Email",
    tag: isReservedDomain(email.value.split("@")[1]) ? undefined : { value: "deliverable", color: Color.Orange },
  }));
}

export default function Command() {
  useEmailDomainWarning();
  const { emailDomain, emailDomainReserved } = preferences();
  return (
    <RecordList
      dropdownId="email-country"
      create={create}
      fields={fields}
      toText={(e) => e.emails.map((x) => x.value).join("\n")}
      toJson={(e) => e.emails.map((x) => x.value)}
      searchBarPlaceholder={
        emailDomainReserved
          ? "Fake email — reserved domains, never delivered"
          : `Fake email — ${emailDomain} is a real domain, mail can be delivered`
      }
    />
  );
}
