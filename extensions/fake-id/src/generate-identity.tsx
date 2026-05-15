import {
  Form,
  ActionPanel,
  Action,
  Detail,
  showToast,
  Toast,
  Clipboard,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import { faker } from "@faker-js/faker";
import { US_STATES, TAX_FREE_STATES } from "./utils/tax-free-states";
import { saveIdentity, type SavedIdentity } from "./utils/storage";

interface Identity {
  fullName: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  age: number;
  ssn: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  stateAbbr: string;
  zipCode: string;
}

function pickRandomState(filter: "all" | "tax-free" | string): {
  name: string;
  abbr: string;
} {
  if (filter === "tax-free") {
    return faker.helpers.arrayElement(TAX_FREE_STATES);
  }
  const state = US_STATES.find((s) => s.name === filter || s.abbr === filter);
  if (state) return state;
  return faker.helpers.arrayElement(US_STATES);
}

function generateSSN(): string {
  const area = faker.string.numeric(3);
  const group = faker.string.numeric(2);
  const serial = faker.string.numeric(4);
  return `${area}-${group}-${serial}`;
}

function generateIdentity(stateFilter: "all" | "tax-free" | string): Identity {
  const state = pickRandomState(stateFilter);
  const gender = faker.helpers.arrayElement(["male", "female"]);
  const firstName = faker.person.firstName(
    gender === "male" ? "male" : "female",
  );
  const lastName = faker.person.lastName();
  const birthDate = faker.date.birthdate({ min: 18, max: 80, mode: "age" });
  const dobStr = birthDate.toISOString().split("T")[0];
  const age = Math.floor(
    (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );

  return {
    fullName: `${firstName} ${lastName}`,
    firstName,
    lastName,
    gender: gender.charAt(0).toUpperCase() + gender.slice(1),
    dateOfBirth: dobStr,
    age,
    ssn: generateSSN(),
    phone: faker.phone.number({ style: "national" }),
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    street: faker.location.streetAddress(true),
    city: faker.location.city(),
    state: state.name,
    stateAbbr: state.abbr,
    zipCode: faker.location.zipCode(),
  };
}

function formatIdentityBlock(id: Identity): string {
  return [
    `## Personal Info`,
    `**Name:** ${id.fullName}`,
    `**Gender:** ${id.gender}`,
    `**Date of Birth:** ${id.dateOfBirth} (Age: ${id.age})`,
    `**SSN:** ${id.ssn}`,
    ``,
    `## Contact`,
    `**Phone:** ${id.phone}`,
    `**Email:** ${id.email}`,
    ``,
    `## Address`,
    `**Street:** ${id.street}`,
    `**City:** ${id.city}`,
    `**State:** ${id.state} (${id.stateAbbr})`,
    `**ZIP Code:** ${id.zipCode}`,
  ].join("\n");
}

function formatAllText(id: Identity): string {
  return [
    `Name: ${id.fullName}`,
    `Gender: ${id.gender}`,
    `DOB: ${id.dateOfBirth} (${id.age})`,
    `SSN: ${id.ssn}`,
    `Phone: ${id.phone}`,
    `Email: ${id.email}`,
    `Address: ${id.street}, ${id.city}, ${id.stateAbbr} ${id.zipCode}`,
  ].join("\n");
}

export default function Command() {
  const [showDetail, setShowDetail] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [stateFilter, setStateFilter] = useState("all");

  function handleGenerate(values: { state: string }) {
    const filter = values.state || "all";
    setStateFilter(filter);
    setIdentity(generateIdentity(filter));
    setShowDetail(true);
  }

  function handleRegenerate() {
    setIdentity(generateIdentity(stateFilter));
  }

  async function handleSave() {
    if (!identity) return;
    const saved: SavedIdentity = {
      id: faker.string.uuid(),
      fullName: identity.fullName,
      gender: identity.gender,
      dateOfBirth: identity.dateOfBirth,
      ssn: identity.ssn,
      phone: identity.phone,
      email: identity.email,
      street: identity.street,
      city: identity.city,
      state: identity.state,
      stateAbbr: identity.stateAbbr,
      zipCode: identity.zipCode,
      createdAt: new Date().toISOString(),
    };
    await saveIdentity(saved);
    showToast(Toast.Style.Success, "Identity saved!");
  }

  if (showDetail && identity) {
    const markdown = `# Generated Identity\n\n${formatIdentityBlock(identity)}`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Copy All"
              icon={Icon.Clipboard}
              onAction={() => {
                Clipboard.copy(formatAllText(identity));
                showToast(Toast.Style.Success, "All info copied to clipboard");
              }}
            />
            <Action
              title="Copy Name"
              icon={Icon.CopyClipboard}
              onAction={() => {
                Clipboard.copy(identity.fullName);
                showToast(Toast.Style.Success, "Name copied");
              }}
            />
            <Action
              title="Copy Ssn"
              icon={Icon.CopyClipboard}
              onAction={() => {
                Clipboard.copy(identity.ssn);
                showToast(Toast.Style.Success, "SSN copied");
              }}
            />
            <Action
              title="Copy Address"
              icon={Icon.CopyClipboard}
              onAction={() => {
                Clipboard.copy(
                  `${identity.street}, ${identity.city}, ${identity.stateAbbr} ${identity.zipCode}`,
                );
                showToast(Toast.Style.Success, "Address copied");
              }}
            />
            <Action
              title="Copy Phone"
              icon={Icon.CopyClipboard}
              onAction={() => {
                Clipboard.copy(identity.phone);
                showToast(Toast.Style.Success, "Phone copied");
              }}
            />
            <Action
              title="Copy Email"
              icon={Icon.CopyClipboard}
              onAction={() => {
                Clipboard.copy(identity.email);
                showToast(Toast.Style.Success, "Email copied");
              }}
            />
            <Action
              title="Save Identity"
              icon={Icon.SaveDocument}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={handleSave}
            />
            <Action
              title="Regenerate"
              icon={Icon.RotateClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={handleRegenerate}
            />
            <Action
              title="Change Options"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() => setShowDetail(false)}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Identity"
            icon={Icon.Plus}
            onSubmit={(values) => handleGenerate(values as { state: string })}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="state" title="State" defaultValue="all">
        <Form.Dropdown.Item value="all" title="🌎 Random (Any State)" />
        <Form.Dropdown.Section title="Tax-Free States (No Sales Tax)">
          {TAX_FREE_STATES.map((s) => (
            <Form.Dropdown.Item
              key={s.abbr}
              value={s.name}
              title={`${s.name} (${s.abbr})`}
            />
          ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="All States">
          {US_STATES.map((s) => (
            <Form.Dropdown.Item
              key={s.abbr}
              value={s.name}
              title={`${s.name} (${s.abbr})`}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
    </Form>
  );
}
