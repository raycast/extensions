import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { readFile } from "fs/promises";
import { AwsAction } from "./components/common/action";
import AwsMfaRoleDropdown from "./components/searchbar/aws-mfa-role-dropdown";
import { AWS_URL_BASE } from "./constants";
import { MfaPrompt, useMfaGuard } from "./components/MfaPrompt";

export default function Console() {
  const { needsMfa, isLoading: mfaLoading, activeRole, revalidate: revalidateMfa } = useMfaGuard();
  const { data: services, isLoading, revalidate } = useCachedPromise(loadJSON);
  const {
    data: sortedServices,
    visitItem,
    resetRanking,
  } = useFrecencySorting(services, {
    namespace: "aws-console",
    sortUnvisited: (a, b) => a.title.localeCompare(b.title),
  });

  const isValidUrl = (arg: string) => {
    try {
      new URL(arg);
      return true;
    } catch {
      return false;
    }
  };

  if (mfaLoading) {
    return <List isLoading={true} />;
  }

  if (needsMfa) {
    return (
      <MfaPrompt
        roleId={activeRole}
        onSuccess={() => {
          revalidateMfa();
          revalidate();
        }}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter services by name..."
      searchBarAccessory={<AwsMfaRoleDropdown onRoleSelected={revalidate} />}
    >
      {sortedServices?.map((service) => {
        const consoleUrl = isValidUrl(service.arg) ? service.arg : `${AWS_URL_BASE}${service.arg}`;
        return (
          <List.Item
            key={service.id}
            title={service.title}
            subtitle={service.subtitle}
            icon={{ source: service.icon.path, mask: Image.Mask.RoundedRectangle }}
            keywords={service.match.split(" ")}
            actions={
              <ActionPanel>
                <AwsAction.Console url={consoleUrl} onAction={() => visitItem(service)} />
                <Action
                  title="Reset Ranking"
                  icon={Icon.ArrowCounterClockwise}
                  onAction={() => resetRanking(service)}
                />
              </ActionPanel>
            }
          />
        );
      })}
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
