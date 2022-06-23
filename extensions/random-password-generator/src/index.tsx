import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Utils } from "./interface";
import { StoryListItem } from "./StoryListItem";
import { generatePasswords } from "./util";

const passwordLengths = [24, 20, 16, 12, 8];

interface PasswordGroup {
  title: string;
  passwords: Utils[];
}

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [passwordLength, setPasswordLength] = useState<number>(16);
  const [showingDetails, setShowingDetails] = useState(false);
  const [passwordGroups, setPasswordGroups] = useState<PasswordGroup[]>();

  useEffect(() => {
    setLoading(true);
    const passwords = generatePasswords(passwordLength);
    const passwordGroups = new Map<string, PasswordGroup>();

    passwords.forEach((password) => {
      const group = passwordGroups.get(password.sectionTitle);
      if (group) {
        group.passwords.push(password);
      } else {
        passwordGroups.set(password.sectionTitle, {
          title: password.sectionTitle,
          passwords: [password],
        });
      }
    });

    const values: PasswordGroup[] = Array.from(passwordGroups.values());

    setPasswordGroups(values);
    setLoading(false);
  }, [passwordLength]);

  return (
    <List
      isShowingDetail={showingDetails}
      isLoading={loading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Password Length"
          onChange={(value) => setPasswordLength(Number(value))}
          storeValue={true}
        >
          {passwordLengths.map((length: number) => (
            <List.Dropdown.Item key={length} title={`${length} characters`} value={length.toString()} />
          ))}
        </List.Dropdown>
      }
    >
      {passwordGroups?.map((group: PasswordGroup, index: number) => (
        <List.Section title={group.title} key={index}>
          {group.passwords.map(({ password, subtitle, strength, icon, sequence, accessoryTitle, sectionTitle }) => (
            <StoryListItem
              key={password}
              password={password}
              subtitle={subtitle}
              strength={strength}
              icon={icon}
              sequence={sequence}
              showingDetails={showingDetails}
              sectionTitle={sectionTitle}
              setShowingDetails={() => setShowingDetails(!showingDetails)}
              accessoryTitle={accessoryTitle}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
