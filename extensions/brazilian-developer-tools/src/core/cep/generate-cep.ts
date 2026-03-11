import * as cheerio from "cheerio";

export const generateCep = async (formated = false): Promise<CepParseResult> => {
  const url = "https://www.4devs.com.br/ferramentas_online.php";

  const body = new URLSearchParams({
    acao: "gerar_cep",
    ...(formated && { somente_numeros: "S" }),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`4devs CEP: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return parseResponse(html);
};

/** Parses 4devs HTML output: values are in the first span inside each #id div. */
export interface CepParseResult {
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
}

const parseResponse = (response: string): CepParseResult => {
  const $ = cheerio.load(response);
  const text = (id: string) => $(`#${id} span`).first().text().trim();
  return {
    cep: text("cep"),
    endereco: text("endereco"),
    bairro: text("bairro"),
    cidade: text("cidade"),
    estado: text("estado"),
  };
};
