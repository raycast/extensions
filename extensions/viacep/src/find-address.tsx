import { Action, ActionPanel, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { BASE_URL } from "./utils/constants";

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

export default function Command(props: { arguments: Arguments.FindAddress }) {
  const [cep, setCep] = useState(props.arguments.cep ?? "");
  const cepRegex = /^[0-9]{5}-?[0-9]{3}$/;
  const isValidCep = cepRegex.test(cep);

  const { data, isLoading } = useFetch<ApiResponse>(`${BASE_URL}/${cep}/json/`, {
    execute: isValidCep,
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setCep}
      searchBarPlaceholder="Search by CEP..."
      throttle
      searchText={cep}
    >
      {data && !("erro" in data) && isValidCep && (
        <List.Item
          id={data.logradouro}
          title={`${data.logradouro}, ${data.bairro}, ${data.localidade}/${data.uf}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Address"
                content={`${data.logradouro}, ${data.bairro}, ${data.localidade}/${data.uf}`}
              />
              <Action.OpenInBrowser title="Open in Apple Maps" url={`maps://?q=${data.cep}`} />
              <Action.OpenInBrowser title="Open in Google Maps" url={`https://www.google.com/maps?q=${data.cep}`} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
