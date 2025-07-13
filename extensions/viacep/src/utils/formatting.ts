interface AddressData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export function formatAddress(data: AddressData): string {
  const parts = [data.logradouro, data.bairro, `${data.localidade}/${data.uf}`].filter((part) => part.trim() !== "");
  return parts.join(", ");
}
