import { Action, ActionPanel, Icon, List, getApplications } from "@raycast/api";
import { getFavicon, usePromise } from "@raycast/utils";
import { CepResponse } from "../find-cep";

interface CepListProps {
  cepData: CepResponse[];
  isLoading: boolean;
}

export default function CepList({ cepData, isLoading }: CepListProps) {
  const { data: appleMapsApp, isLoading: isAppLoading } = usePromise(async () => {
    const apps = await getApplications();
    return apps.find((app) => app.bundleId === "com.apple.Maps");
  });

  return (
    <List isLoading={isLoading || isAppLoading}>
      <List.Section title="Results" subtitle={`${cepData.length} ${cepData.length === 1 ? "CEP" : "CEPs"}`}>
        {cepData.map((data, index) => {
          const subtitle = data.complemento
            ? `${data.logradouro}, ${data.complemento}, ${data.bairro}, ${data.localidade}/${data.uf}`
            : `${data.logradouro}, ${data.bairro}, ${data.localidade}/${data.uf}`;

          return (
            <List.Item
              key={index}
              id={data.cep}
              title={data.cep}
              subtitle={subtitle}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy CEP" content={data.cep} />
                  <Action.OpenInBrowser
                    title="Open in Apple Maps"
                    url={`maps://?q=${data.cep}`}
                    icon={appleMapsApp ? { fileIcon: appleMapsApp.path } : Icon.Globe}
                  />
                  <Action.OpenInBrowser
                    title="Open in Google Maps"
                    url={`https://www.google.com/maps?q=${data.cep}`}
                    icon={getFavicon("https://www.google.com/maps")}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
