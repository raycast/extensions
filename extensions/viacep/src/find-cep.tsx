import { useFetch } from "@raycast/utils";
import { useState } from "react";
import AddressForm from "./components/AddressForm";
import CepResults from "./components/CepList";
import { BASE_URL } from "./utils/constants";

export interface CepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export default function Command() {
  const [formValues, setFormValues] = useState<{ uf: string; city: string; streetName: string } | null>(null);

  const { data, isLoading } = useFetch<CepResponse[]>(
    `${BASE_URL}/${formValues?.uf}/${formValues?.city}/${formValues?.streetName}/json/`,
    {
      execute: !!formValues,
    },
  );

  return data ? <CepResults cepData={data} isLoading={isLoading} /> : <AddressForm onSubmit={setFormValues} />;
}
