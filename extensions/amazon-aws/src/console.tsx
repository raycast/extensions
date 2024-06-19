import { ActionPanel, List, Image } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readFile } from "fs/promises";
import { AwsAction } from "./components/common/action";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { AWS_URL_BASE } from "./constants";

export default function Console() {
  const { data: services, isLoading, revalidate } = useCachedPromise(loadJSON);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter services by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {services?.map((service) => (
        <List.Item
          key={service.uid}
          title={service.title}
          subtitle={service.subtitle}
          icon={{ source: service.icon.path, mask: Image.Mask.RoundedRectangle }}
          keywords={service.match.split(" ")}
          actions={
            <ActionPanel>
              <AwsAction.Console
                url={
                  typeof process.env.AWS_SSO_ACCOUNT_ID !== "undefined" &&
                  typeof process.env.AWS_SSO_ROLE_NAME !== "undefined" &&
                  typeof process.env.AWS_SSO_START_URL !== "undefined"
                    ? `${normalizeUrl(process.env.AWS_SSO_START_URL)}console?account_id=${encodeURI(process.env.AWS_SSO_ACCOUNT_ID)}&role_name=${encodeURI(process.env.AWS_SSO_ROLE_NAME)}&destination=${encodeURI(AWS_URL_BASE + service.arg)}`
                    : `${AWS_URL_BASE}${service.arg}`
                }
              />
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
  match: string;
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

function normalizeUrl(url: string): string {
  if (url.endsWith("/")) {
    return url;
  }
  return `${url}/`;
}
