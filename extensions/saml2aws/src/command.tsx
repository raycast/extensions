import { ActionPanel, Action, List, useNavigation, Detail } from "@raycast/api";
import { login, getConfigurations } from "./saml2aws";
import { useEffect, useState } from "react";

interface Item {
  id: string;
  title: string;
}

const items = Object.values(getConfigurations()).map((config) => {
  const item: Item = {
    id: config.name,
    title: config.name,
  };

  return item;
});

function LoginList({ configName }: { configName: string }) {
  const [mfaEntropy, setMfaEntropy] = useState<undefined | string>(undefined);
  const [done, setDone] = useState<undefined | { expiresAt: Date }>(undefined);
  const [error, setError] = useState<undefined | string>(undefined);

  useEffect(() => {
    login(configName, setMfaEntropy, setDone, setError);

    return;
  }, []);

  if (error) return <Detail markdown={error} />;
  if (done)
    return (
      <Detail
        markdown="Done"
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Expires" text={done.expiresAt.toString()} />
          </Detail.Metadata>
        }
      />
    );
  if (mfaEntropy) return <Detail isLoading={true} markdown={`MFA entropy is ${mfaEntropy}`} />;
  return <Detail isLoading={true} markdown="Loading" />;
}

export const Command = () => {
  const { push } = useNavigation();

  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(items);

  useEffect(() => {
    filterList(items.filter((item) => item.title.includes(searchText)));
  }, [searchText]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search"
      searchBarPlaceholder="Search Your Configuration"
    >
      {filteredList.map((item) => (
        <List.Item
          key={item.id}
          icon="list-icon.png"
          title={item.title}
          actions={
            <ActionPanel>
              <Action title={item.title} onAction={() => push(<LoginList configName={item.id} />)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
