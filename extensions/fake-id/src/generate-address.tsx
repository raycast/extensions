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

interface Address {
  street: string;
  city: string;
  state: string;
  stateAbbr: string;
  zipCode: string;
  county: string;
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

function generateAddress(stateFilter: "all" | "tax-free" | string): Address {
  const state = pickRandomState(stateFilter);
  return {
    street: faker.location.streetAddress(true),
    city: faker.location.city(),
    state: state.name,
    stateAbbr: state.abbr,
    zipCode: faker.location.zipCode(),
    county: faker.location.county(),
  };
}

function formatAddressBlock(addr: Address): string {
  return [
    `**Street:** ${addr.street}`,
    `**City:** ${addr.city}`,
    `**State:** ${addr.state} (${addr.stateAbbr})`,
    `**ZIP Code:** ${addr.zipCode}`,
    `**County:** ${addr.county}`,
  ].join("\n");
}

function formatAddressLine(addr: Address): string {
  return `${addr.street}, ${addr.city}, ${addr.stateAbbr} ${addr.zipCode}`;
}

function AddressDetail({
  address,
  onBack,
}: {
  address: Address;
  onBack: () => void;
}) {
  const markdown = `# Generated Address\n\n${formatAddressBlock(address)}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Address"
            icon={Icon.Clipboard}
            onAction={() => {
              Clipboard.copy(formatAddressLine(address));
              showToast(Toast.Style.Success, "Address copied to clipboard");
            }}
          />
          <Action
            title="Copy Full Details"
            icon={Icon.Clipboard}
            onAction={() => {
              Clipboard.copy(
                `Name: -\nStreet: ${address.street}\nCity: ${address.city}\nState: ${address.state} (${address.stateAbbr})\nZIP: ${address.zipCode}`,
              );
              showToast(
                Toast.Style.Success,
                "Full address copied to clipboard",
              );
            }}
          />
          <Action
            title="Regenerate"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onBack}
          />
          <Action
            title="Change Options"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={onBack}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [showDetail, setShowDetail] = useState(false);
  const [address, setAddress] = useState<Address | null>(null);
  const [, setStateFilter] = useState("all");

  function handleGenerate(values: { state: string }) {
    const filter = values.state || "all";
    setStateFilter(filter);
    const addr = generateAddress(filter);
    setAddress(addr);
    setShowDetail(true);
  }

  if (showDetail && address) {
    return (
      <AddressDetail address={address} onBack={() => setShowDetail(false)} />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Address"
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
