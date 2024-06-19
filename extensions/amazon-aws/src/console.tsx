import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { readFile } from "fs/promises";
import { AwsAction } from "./components/common/action";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { AWS_URL_BASE } from "./constants";
import { normalizeUrl } from "./util";

export default function Console() {
  const { data: services, isLoading, revalidate } = useCachedPromise(loadJSON);
  const {
    data: sortedServices,
    visitItem,
    resetRanking,
  } = useFrecencySorting(services, {
    namespace: "aws-console",
    sortUnvisited: (a, b) => a.title.localeCompare(b.title),
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter services by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {sortedServices?.map((service) => (
        <List.Item
          key={service.id}
          title={service.title}
          subtitle={service.subtitle}
          icon={{ source: service.icon.path, mask: Image.Mask.RoundedRectangle }}
          keywords={service.match.split(" ")}
          actions={
            <ActionPanel>
              <AwsAction.Console
                url={
                  process.env.AWS_SSO_ACCOUNT_ID && process.env.AWS_SSO_ROLE_NAME && process.env.AWS_SSO_START_URL
                    ? `${normalizeUrl(process.env.AWS_SSO_START_URL!)}console?account_id=${encodeURI(process.env.AWS_SSO_ACCOUNT_ID!)}&role_name=${encodeURI(process.env.AWS_SSO_ROLE_NAME!)}&destination=${encodeURI(AWS_URL_BASE + service.arg)}`
                    : `${AWS_URL_BASE}${service.arg}`
                }
                onAction={() => visitItem(service)}
              />
              <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(service)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type AWSService = {
  id: string;
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
  return (JSON.parse(file).items as AWSService[]).filter((service) => !!service.title && !!service.id);
}
