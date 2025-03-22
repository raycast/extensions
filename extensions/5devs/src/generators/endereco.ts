import fetch from "node-fetch";
import { ceps } from "../data/ceps";

export type AddressData = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
};

export async function addressData() {
  const cepNumber = cep();

  const addressData = await fetch(`https://viacep.com.br/ws/${cepNumber}/json/`)
    .then((response) => response.json() as Promise<AddressData>)
    .catch(() => null);

  if (!addressData) {
    return {
      cep: cepNumber,
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      localidade: "",
      uf: "",
    };
  }

  return {
    cep: cepNumber ?? addressData?.cep,
    logradouro: addressData?.logradouro,
    numero: (Math.floor(Math.random() * 900) + 100).toString(),
    complemento: addressData?.complemento,
    bairro: addressData?.bairro,
    localidade: addressData?.localidade,
    uf: addressData?.uf,
  };
}

export function cep(): string {
  const cep = ceps[Math.floor(Math.random() * ceps.length)];

  return `${cep?.slice(0, 5)}-${cep?.slice(5)}`;
}
