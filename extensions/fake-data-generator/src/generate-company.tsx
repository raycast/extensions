import { Color, Icon } from "@raycast/api";
import { RecordField, RecordList } from "./components/RecordList";
import { company, Company, Profile } from "./lib/people";
import { preferences } from "./preferences";

function create(profile: Profile): Company {
  return company(profile, preferences().phoneMode);
}

function fields(c: Company): RecordField[] {
  return [
    { id: "name", section: "Company", title: "Company name", value: c.name, icon: Icon.Building },
    { id: "base", section: "Company", title: "Name without legal form", value: c.baseName, icon: Icon.Building },
    { id: "form", section: "Company", title: "Legal form", value: c.legalForm, icon: Icon.Building },
    { id: "vat", section: "Company", title: "VAT number", value: c.vat, icon: Icon.Receipt },
    {
      id: "reg",
      section: "Company",
      title: c.registration?.label ?? "Registration",
      value: c.registration?.value,
      icon: Icon.Document,
    },
    ...c.extraIds.map((f) => ({
      id: f.label,
      section: "Company",
      title: f.label,
      value: f.value,
      icon: Icon.Document,
    })),
    { id: "email", section: "Contact", title: "Email", value: c.email, icon: Icon.Envelope },
    { id: "website", section: "Contact", title: "Website", value: c.website, icon: Icon.Globe },
    {
      id: "phone",
      section: "Contact",
      title: "Phone",
      value: c.phone,
      icon: Icon.Phone,
      tag: c.phoneFictional ? { value: "fictional", color: Color.Green } : { value: "random", color: Color.Orange },
    },
    { id: "street", section: "Address", title: "Street", value: c.address.street, icon: Icon.House },
    { id: "postcode", section: "Address", title: "Postcode", value: c.address.postcode, icon: Icon.House },
    { id: "city", section: "Address", title: "City", value: c.address.city, icon: Icon.House },
    { id: "region", section: "Address", title: "State / region", value: c.address.region, icon: Icon.House },
    { id: "country", section: "Address", title: "Country", value: c.address.country, icon: Icon.Globe },
    { id: "address", section: "Address", title: "Full address", value: c.address.oneLine, icon: Icon.Map },
    { id: "iban", section: "Bank", title: "IBAN", value: c.iban, icon: Icon.BankNote },
    {
      id: "iban-compact",
      section: "Bank",
      title: "IBAN (compact)",
      value: c.iban?.replace(/ /g, ""),
      icon: Icon.BankNote,
    },
    { id: "bic", section: "Bank", title: "BIC", value: c.bic, icon: Icon.BankNote },
    { id: "bank", section: "Bank", title: "Bank", value: c.bank, icon: Icon.BankNote },
    ...(c.bankAccount ?? []).map((f) => ({
      id: f.label,
      section: "Bank",
      title: f.label,
      value: f.value,
      icon: Icon.BankNote,
    })),
  ];
}

function toText(c: Company): string {
  return [
    c.name,
    c.address.multiLine,
    c.vat && `VAT: ${c.vat}`,
    c.registration && `${c.registration.label}: ${c.registration.value}`,
    c.phone,
    c.email,
    c.website,
    c.iban && `IBAN: ${c.iban}`,
    c.bic && `BIC: ${c.bic}`,
    ...(c.bankAccount ?? []).map((f) => `${f.label}: ${f.value}`),
  ]
    .filter(Boolean)
    .join("\n");
}

function toJson(c: Company) {
  return {
    name: c.name,
    legalForm: c.legalForm,
    vatNumber: c.vat,
    registration: c.registration && { [c.registration.label]: c.registration.value },
    email: c.email,
    website: c.website,
    phone: c.phone,
    address: {
      street: c.address.street,
      postcode: c.address.postcode,
      city: c.address.city,
      region: c.address.region,
      country: c.address.country,
    },
    iban: c.iban?.replace(/ /g, ""),
    bic: c.bic,
    bankAccount: c.bankAccount && Object.fromEntries(c.bankAccount.map((f) => [f.label, f.value])),
  };
}

export default function Command() {
  return (
    <RecordList
      dropdownId="company-country"
      create={create}
      fields={fields}
      toText={toText}
      toJson={toJson}
      searchBarPlaceholder="Search fields — ⌘⇧C copies the whole company"
    />
  );
}
