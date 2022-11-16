import { ActionPanel, List, Action } from "@raycast/api";
import { readFile } from "fs/promises";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const { data: services, isLoading } = useCachedPromise(loadJSON);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter services by name...">
      {services?.map((service) => (
        <List.Item
          id={service.uid}
          key={service.uid}
          title={service.title}
          subtitle={service.subtitle}
          icon={service.icon.path}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://console.aws.amazon.com${service.arg}`} />
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

async function loadJSON() {
  const file = await readFile(`${__dirname}/assets/aws-services.json`, "utf8");
  const services = (JSON.parse(file).items as AWSService[])
    .filter((service) => {
      return !!service.title; // Only include services that have a title
    })
    .sort((a, b) => (a.title > b.title ? 1 : b.title > a.title ? -1 : 0));

  return services;
}
