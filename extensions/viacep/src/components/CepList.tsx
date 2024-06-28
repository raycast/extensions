import { Action, ActionPanel, List } from "@raycast/api";
import { CepResponse } from "../find-cep";

interface CepListProps {
  cepData: CepResponse[];
  isLoading: boolean;
}

export default function CepList({ cepData, isLoading }: CepListProps) {
  return (
    <List isLoading={isLoading}>
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
                  <Action.OpenInBrowser title="Open in Apple Maps" url={`maps://?q=${data.cep}`} />
                  <Action.OpenInBrowser title="Open in Google Maps" url={`https://www.google.com/maps?q=${data.cep}`} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
