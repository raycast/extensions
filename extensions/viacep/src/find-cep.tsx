import { Action, ActionPanel, Form, List, Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface CepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
}

const STATE_CODES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export default function Command() {
  const [formValues, setFormValues] = useState<{ uf: string; city: string; streetName: string } | null>(null);

  const { data, isLoading } = useFetch<CepResponse[]>(
    formValues ? `https://viacep.com.br/ws/${formValues.uf}/${formValues.city}/${formValues.streetName}/json/` : "",
    {
      execute: formValues !== null,
    },
  );

  const handleSubmit = (values: { uf: string; city: string; streetName: string }) => {
    if (!values.uf || !values.city || !values.streetName) {
      showToast(Toast.Style.Failure, "Please enter street name and city");
      return;
    }

    setFormValues(values);
  };

  return data ? (
    <CepResults cepData={data} isLoading={isLoading} />
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Find CEP" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="streetName" title="Street Name" placeholder="Avenida Paulista" />
      <Form.TextField id="city" title="City" placeholder="São Paulo" />
      <Form.Dropdown id="uf" title="State Code" placeholder="Select a state code" defaultValue="SP">
        {STATE_CODES.map((code) => (
          <Form.Dropdown.Item key={code} value={code} title={code} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function CepResults({ cepData, isLoading }: { cepData: CepResponse[]; isLoading: boolean }) {
  return (
    <List isLoading={isLoading}>
      <List.Section title="Results" subtitle={`${cepData.length}`}>
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
