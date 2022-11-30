import { GetParametersByPathCommand, GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import AWSProfileDropdown, { AWS_URL_BASE } from "./util/aws-profile-dropdown";

export default function Console() {
  const { data: services, error, isLoading, revalidate } = useCachedPromise(loadServices);
  const progressIcon = useProgressIcon({ show: isLoading && !services });

  return (
    <List
      isLoading={isLoading && !!services}
      searchBarPlaceholder="Filter services by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : progressIcon ? (
        <List.EmptyView
          title="Loading..."
          icon={progressIcon}
          description="The first run of this command will take a few seconds. But don't worry, the next time it'll already be very fast."
        />
      ) : (
        services?.map((service, index) => (
          <List.Item
            title={service?.name || service.id}
            key={index}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={`${AWS_URL_BASE}/${service.id}`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

interface Service {
  id: string;
  name: string;
}

async function loadServices(token?: string, accServices?: Service[]): Promise<Service[]> {
  const ssm = new SSMClient({});
  const prefix = "/aws/service/global-infrastructure";
  const { Parameters: idParameters, NextToken } = await ssm.send(
    new GetParametersByPathCommand({
      Path: `${prefix}/regions/${process.env.AWS_REGION}/services`,
      Recursive: true,
      NextToken: token,
    })
  );

  const serviceIds = (idParameters || []).map((p) => p.Value).filter((v): v is string => !!v);

  const { Parameters: nameParameters } = await ssm.send(
    new GetParametersCommand({ Names: serviceIds.map((id) => `${prefix}/services/${id}/longName`) })
  );

  const services = serviceIds
    .map((id) => {
      const name = nameParameters?.find((p) => p.Name?.split("/").at(-2) === id)?.Value;
      return name && { id, name };
    })
    .filter((s): s is Service => !!s);

  if (NextToken) {
    return loadServices(NextToken, [...(accServices ?? []), ...services]);
  }

  return [...(accServices ?? []), ...services];
}

function useProgressIcon({ show }: { show: boolean }) {
  const [progress, setProgress] = useState<
    Icon.CircleProgress25 | Icon.CircleProgress50 | Icon.CircleProgress75 | Icon.CircleProgress100
  >(Icon.CircleProgress25);

  useEffect(() => {
    if (!show) {
      return;
    }

    const interval = setInterval(() => {
      setProgress((progress) => {
        switch (progress) {
          case Icon.CircleProgress25:
            return Icon.CircleProgress50;
          case Icon.CircleProgress50:
            return Icon.CircleProgress75;
          case Icon.CircleProgress75:
            return Icon.CircleProgress100;
          case Icon.CircleProgress100:
            return Icon.CircleProgress25;
        }
      });
    }, 700);

    return () => clearInterval(interval);
  }, [show]);

  return show ? progress : undefined;
}
