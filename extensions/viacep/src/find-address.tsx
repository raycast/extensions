import { Action, ActionPanel, Icon, List, getApplications } from "@raycast/api";
import { getFavicon, useFetch, usePromise } from "@raycast/utils";
import { useState } from "react";
import { BASE_URL } from "./utils/constants";
import { formatAddress } from "./utils/formatting";

type Arguments = {
  FindAddress: {
    cep?: string;
  };
};

interface ValidCepResponse {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

interface InvalidCepResponse {
  erro: boolean;
}

type ApiResponse = ValidCepResponse | InvalidCepResponse;

export default function Command(props: { arguments: Arguments["FindAddress"] }) {
  const [cep, setCep] = useState(props.arguments.cep ?? "");

  const { data: appleMapsApp, isLoading: isAppLoading } = usePromise(async () => {
    const apps = await getApplications();
    return apps.find((app) => app.bundleId === "com.apple.Maps");
  });

  const cepRegex = /^[0-9]{5}-?[0-9]{3}$/;
  const isValidCep = cepRegex.test(cep);

  const { data, isLoading } = useFetch<ApiResponse>(`${BASE_URL}/${cep}/json/`, {
    execute: isValidCep,
  });

  return (
    <List
      isLoading={isLoading || isAppLoading}
      onSearchTextChange={setCep}
      searchBarPlaceholder="Search by CEP"
      throttle
      searchText={cep}
    >
      {data && !("erro" in data) && isValidCep && (
        <List.Item
          title={formatAddress(data)}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Address" content={formatAddress(data)} />
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
      )}
    </List>
  );
}
