import { Color, Icon } from "@raycast/api";
import { RecordField, RecordList } from "./components/RecordList";
import { person, Person, Profile } from "./lib/people";
import { preferences } from "./preferences";

function create(profile: Profile): Person {
  const { emailDomain, phoneMode } = preferences();
  return person(profile, emailDomain, phoneMode);
}

function localDate(isoDate: string, iso: string): string {
  const [y, m, d] = isoDate.split("-");
  return iso === "US" ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
}

function fields(p: Person): RecordField[] {
  const iso = p.address.country === "United States" ? "US" : "";
  return [
    { id: "full", section: "Name", title: "Full name", value: p.fullName, icon: Icon.Person },
    { id: "first", section: "Name", title: "First name", value: p.firstName, icon: Icon.Person },
    { id: "last", section: "Name", title: "Last name", value: p.lastName, icon: Icon.Person },
    { id: "sex", section: "Name", title: "Gender", value: p.sex === "female" ? "Female" : "Male", icon: Icon.Person },
    { id: "birth", section: "Name", title: "Date of birth", value: p.birthdate, icon: Icon.Calendar },
    {
      id: "birth-local",
      section: "Name",
      title: "Date of birth (local)",
      value: localDate(p.birthdate, iso),
      icon: Icon.Calendar,
    },
    { id: "email", section: "Contact", title: "Email", value: p.email, icon: Icon.Envelope },
    { id: "username", section: "Contact", title: "Username", value: p.username, icon: Icon.AtSymbol },
    {
      id: "phone",
      section: "Contact",
      title: "Mobile",
      value: p.phone,
      icon: Icon.Mobile,
      tag: p.phoneFictional ? { value: "fictional", color: Color.Green } : { value: "random", color: Color.Orange },
    },
    { id: "phone-national", section: "Contact", title: "Mobile (national)", value: p.phoneNational, icon: Icon.Mobile },
    { id: "street", section: "Address", title: "Street", value: p.address.street, icon: Icon.House },
    { id: "postcode", section: "Address", title: "Postcode", value: p.address.postcode, icon: Icon.House },
    { id: "city", section: "Address", title: "City", value: p.address.city, icon: Icon.House },
    { id: "region", section: "Address", title: "State / region", value: p.address.region, icon: Icon.House },
    { id: "country", section: "Address", title: "Country", value: p.address.country, icon: Icon.Globe },
    { id: "address", section: "Address", title: "Full address", value: p.address.oneLine, icon: Icon.Map },
  ];
}

function toText(p: Person): string {
  return [p.fullName, p.email, p.phone, p.address.multiLine, `Born ${p.birthdate}`].filter(Boolean).join("\n");
}

function toJson(p: Person) {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    fullName: p.fullName,
    gender: p.sex,
    birthdate: p.birthdate,
    email: p.email,
    username: p.username,
    phone: p.phone,
    address: {
      street: p.address.street,
      postcode: p.address.postcode,
      city: p.address.city,
      region: p.address.region,
      country: p.address.country,
    },
  };
}

export default function Command() {
  return (
    <RecordList
      dropdownId="person-country"
      create={create}
      fields={fields}
      toText={toText}
      toJson={toJson}
      searchBarPlaceholder="Search fields — ⌘⇧C copies the whole person"
    />
  );
}
