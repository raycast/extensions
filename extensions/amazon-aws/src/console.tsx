import { ActionPanel, List, OpenInBrowserAction } from "@raycast/api";
import { useEffect, useState } from "react";
import { readFileSync } from "fs";

export default function Command() {
  const [state, setState] = useState<{ services: AWSService[]; loaded: boolean }>({
    services: [],
    loaded: false,
  });

  useEffect(() => {
    async function loadJSON() {
      const services = JSON.parse(readFileSync(`${__dirname}/assets/aws-services.json`, "utf8"))
        .items.filter((service: AWSService) => {
          return !!service.title; // Only include services that have a title
        })
        .sort((a: AWSService, b: AWSService) => (a.title > b.title ? 1 : b.title > a.title ? -1 : 0));

      setState({
        loaded: true,
        services,
      });
    }

    loadJSON();
  }, []);

  return (
    <List isLoading={!state.loaded} searchBarPlaceholder="Filter services by name...">
      {state.services.map((service) => (
        <List.Item
          id={service.uid}
          key={service.uid}
          title={service.title}
          subtitle={service.subtitle}
          icon={service.icon.path}
          actions={
            <ActionPanel>
              <OpenInBrowserAction url={`https://console.aws.amazon.com${service.arg}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type AWSService = {
  uid: string;
  title: string;
  subtitle: string;
  arg: string;
  icon: AWSIcon;
};

type AWSIcon = {
  path: string;
};
