import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { PasswordItem } from "./interface";
import { StoryListItem } from "./StoryListItem";
import { generatePasswords } from "./util";

const passwordLengths = [128, 64, 32, 24, 20, 16, 12, 8];
// stores whether password details should be auto calculated for different password length
const autoCalculatePrefs = passwordLengths.reduce((acc, length) => {
  acc[length] = length <= 24;
  return acc;
}, {} as Record<number, boolean>);

const defaultPasswordLength = 16;

interface PasswordGroup {
  title: string;
  passwords: PasswordItem[];
}

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [passwordLength, setPasswordLength] = useState<number>(defaultPasswordLength);
  const [focusedPassword, setFocusedPassword] = useState<string>();
  const [showingDetails, setShowingDetails] = useState(false);
  const [passwordGroups, setPasswordGroups] = useState<PasswordGroup[]>();

  useEffect(() => {
    setLoading(true);
    const passwords = generatePasswords(passwordLength);
    const passwordGroups = new Map<string, PasswordGroup>();

    passwords.forEach((password) => {
      const sectionTitle = password.options.name; //password.sectionTitle
      const group = passwordGroups.get(sectionTitle);
      if (group) {
        group.passwords.push(password);
      } else {
        passwordGroups.set(sectionTitle, {
          title: sectionTitle,
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
      onSelectionChange={(id?: string) => setFocusedPassword(id)}
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
          {group.passwords.map(({ password, options }) => (
            <StoryListItem
              key={password}
              password={password}
              options={options}
              showingDetails={showingDetails}
              setShowingDetails={() => setShowingDetails(!showingDetails)}
              autoCalculateDetails={autoCalculatePrefs[passwordLength]}
              isFocused={!!focusedPassword && focusedPassword === password}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
