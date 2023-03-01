import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { execa } from "execa";
import { useMemo, useState } from "react";
import { parseRelayList } from "./utils";

// {...(i === 3 && {
//           accessories: [
//             {
//               text: { value: `Connected`, color: Color.Green },
//               icon: { source: Icon.Checkmark, tintColor: Color.Green },
//             },
//           ],
//         })}

async function connectToTunnel(name: string, id: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Connecting to ${name}` });

  await execa("mullvad", ["relay", "set", "location", id], { shell: true });
  await execa("mullvad", ["connect", "-w"], { shell: true });

  toast.title = `Connected to ${name}`;
  toast.style = Toast.Style.Success;
}

export default function Command() {
  const { isLoading, data: relayList } = useExec("mullvad", ["relay list"], { shell: true });
  const { data: status, revalidate } = useExec("mullvad", ["status"], { shell: true });

  const relayItems = useMemo(() => parseRelayList(relayList ?? ""), [relayList]);

  const [selectionScope, setSectionScope] = useState("country");

  let items: React.ReactNode = [];

  if (selectionScope === "country") {
    items = relayItems.map((country) => (
      <List.Item
        key={country.id}
        title={`${country.name}`}
        keywords={[country.name, country.id]}
        actions={
          <ActionPanel>
            <Action
              title={`Connect VPN tunnel via ${country.name}`}
              onAction={() => connectToTunnel(country.name, country.id)}
            />
          </ActionPanel>
        }
      />
    ));
  }

  if (selectionScope === "city") {
    items = relayItems.map((country) => (
      <List.Section title={country.name} key={country.id}>
        {country.children?.map((city) => (
          <List.Item
            key={city.id}
            title={`${city.name}`}
            keywords={[city.name, city.id, country.name, country.id]}
            actions={
              <ActionPanel>
                <Action
                  title={`Connect VPN tunnel via ${country.name}, ${city.name}`}
                  onAction={() => connectToTunnel(`${country.name}, ${city.name}`, `${country.id} ${city.id}`)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    ));
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          value={selectionScope}
          tooltip="Select server scope"
          onChange={(value) => setSectionScope(value)}
        >
          <List.Dropdown.Item title="Country" value="country" />
          <List.Dropdown.Item title="City" value="city" />
        </List.Dropdown>
      }
    >
      {items}
    </List>
  );
}
