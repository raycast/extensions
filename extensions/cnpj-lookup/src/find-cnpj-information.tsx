import { Detail, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface CNPJData {
  ultima_atualizacao: string;
  cnpj: string;
  tipo: string;
  abertura: string;
  nome: string;
  atividade_principal: [{ code: string; text: string }];
  atividades_secundarias: [{ code: string; text: string }];
  natureza_juridica: string;
  logradouro: string;
  numero: string;
  complemento: string;
  cep: string;
  bairro: string;
  municipio: string;
  uf: string;
  email: string;
  telefone: string;
  capital_social: string;
  qsa: [{ nome: string; qual: string }];
  data_situacao: string;
  situacao: string;
  fantasia: string;
  simples: {
    optante: boolean;
    data_opcao: string | null;
    data_exclusao: string | null;
    ultima_atualizacao: string;
  };
  simei: {
    optante: boolean;
    data_opcao: string | null;
    data_exclusao: string | null;
    ultima_atualizacao: string;
  };
  message?: string;
}

function formatDate(dateString: string) {
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZone: "America/Sao_Paulo",
    hour12: false,
  };
  const date = new Date(dateString);
  const formattedDate = new Intl.DateTimeFormat("pt-BR", options).format(date);
  return formattedDate.replace(",", " às");
}

function formatDateShort(dateString: string | null): string {
  if (!dateString) return "";

  const ddmmyyyyPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateString.match(ddmmyyyyPattern);

  let date: Date;
  if (match) {
    const [, day, month, year] = match;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  } else {
    date = new Date(dateString);
  }

  if (isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatSimplesNacional(simples: CNPJData["simples"]): string {
  if (!simples.optante) {
    return "Não Optante";
  }

  const parts: string[] = ["Optante"];

  if (simples.data_opcao) {
    const dataOpcao = formatDateShort(simples.data_opcao);
    if (dataOpcao) {
      parts.push(`Desde ${dataOpcao}`);
    }
  }

  if (simples.ultima_atualizacao) {
    const ultimaAtualizacao = formatDateShort(simples.ultima_atualizacao);
    if (ultimaAtualizacao) {
      parts.push(`Última Atualização: ${ultimaAtualizacao}`);
    }
  }

  return parts.join(" &#124; ");
}

function formatMEI(simei: CNPJData["simei"]): string {
  if (simei.optante) {
    return "Optante";
  } else {
    return "Não Enquadrado";
  }
}

export default function Command(props: { arguments: Arguments.FindCnpjInformation }) {
  const query = props.arguments.cnpj ?? "";
  const pattern = /^[0-9]{2}\.?([0-9]{3}\.?){2}\/?[0-9]{4}-?[0-9]{2}$/;
  const isValidCNPJ = pattern.test(query);

  const { data, isLoading } = useFetch<CNPJData>(
    isValidCNPJ ? `https://receitaws.com.br/v1/cnpj/${query.replace(/[-./]/g, "")}` : "",
    { execute: isValidCNPJ },
  );

  if (!isValidCNPJ || (data && data.message === "CNPJ inválido")) {
    showToast(Toast.Style.Failure, "Invalid CNPJ");
  }

  let ultimaAtualizacao = "";
  if (data && data.ultima_atualizacao) {
    const date = new Date(data.ultima_atualizacao);
    if (isNaN(date.getTime())) {
      throw new Error(
        `Invalid date value from API. CNPJ: ${data.cnpj || query}, ` +
          `ultima_atualizacao: "${data.ultima_atualizacao}"`,
      );
    }
    ultimaAtualizacao = formatDate(data.ultima_atualizacao);
  }

  const atividadesSecundarias =
    data && data.atividades_secundarias.map((atividade) => `${atividade.code} | ${atividade.text}`).join("\n");

  const capitalSocial =
    data &&
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(data.capital_social));

  const qsa = data && data.qsa.map((socio) => `${socio.nome} | ${socio.qual}`).join("\n");

  const simplesNacional = data ? formatSimplesNacional(data.simples) : "";
  const mei = data ? formatMEI(data.simei) : "";

  const markdown =
    data && !data.message
      ? `
  | **Última Atualização**                                                    |
  |---------------------------------------------------------------------------|
  | ${ultimaAtualizacao}                                                      |

  | **Número de Inscrição**             | **Data de Abertura**                |
  |-------------------------------------|-------------------------------------|
  | ${data.cnpj} - ${data.tipo}         | ${data.abertura}                    |

  | **Nome Empresarial**                |
  |-------------------------------------|
  | ${data.nome}                        |

  | **Atividade Econômica Primária**                                          |
  |---------------------------------------------------------------------------|

  | **Código**                          | **Descrição**                       |
  |-------------------------------------|-------------------------------------|
  | ${data.atividade_principal[0].code} | ${data.atividade_principal[0].text} |

  | **Atividades Econômicas Secundárias**                                     |
  |---------------------------------------------------------------------------|

  | **Código**                          | **Descrição**                       |
  |-------------------------------------|-------------------------------------|
  | ${atividadesSecundarias}                                                  |

  | **Código e Descrição da Natureza Jurídica**                               |
  |---------------------------------------------------------------------------|
  | ${data.natureza_juridica}                                                 |

  | **Logradouro**           | **Número**          | **Complemento**          |
  |--------------------------|---------------------|--------------------------|
  | ${data.logradouro}       | ${data.numero}      | ${data.complemento}      |

  | **CEP**        | **Bairro**        | **Município**        | **UF**        |
  |----------------|-------------------|----------------------|---------------|
  | ${data.cep}    | ${data.bairro}    | ${data.municipio}    | ${data.uf}    |

  | **Endereço Eletrônico**            | **Telefone**                         |
  |------------------------------------|--------------------------------------|
  | ${data.email}                      | ${data.telefone}                     |

  | **Capital Social**                                                        |
  |---------------------------------------------------------------------------|
  | ${capitalSocial}                                                          |

  | **Simples Nacional**                                                      |
  |---------------------------------------------------------------------------|
  | ${simplesNacional}                                                       |

  | **MEI**                                                                   |
  |---------------------------------------------------------------------------|
  | ${mei}                                                                    |

  | **Quadro de Sócios e Administradores**                                    |
  |---------------------------------------------------------------------------|
  | ${qsa}                                                                    |

  | **Situação Cadastral**             | **Data da Situação Cadastral**       |
  |------------------------------------|--------------------------------------|
  | ${data.situacao}                   | ${data.data_situacao}                |
  `
      : `􀁞 Please enter a valid CNPJ to search for information.`;

  return <Detail isLoading={isLoading} markdown={markdown} navigationTitle="CNPJ Information" />;
}
