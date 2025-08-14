export const COURTS = {
  // Tribunais Superiores
  STF: "Supremo Tribunal Federal",
  STJ: "Superior Tribunal de Justiça",
  STM: "Superior Tribunal Militar",
  TSE: "Tribunal Superior Eleitoral",
  TST: "Tribunal Superior do Trabalho",

  // Tribunais de Justiça Estaduais
  TJAC: "Tribunal de Justiça do Acre",
  TJAL: "Tribunal de Justiça de Alagoas",
  TJAM: "Tribunal de Justiça do Amazonas",
  TJAP: "Tribunal de Justiça do Amapá",
  TJBA: "Tribunal de Justiça da Bahia",
  TJCE: "Tribunal de Justiça do Ceará",
  TJDFT: "Tribunal de Justiça do Distrito Federal e Territórios",
  TJES: "Tribunal de Justiça do Espírito Santo",
  TJGO: "Tribunal de Justiça de Goiás",
  TJMA: "Tribunal de Justiça do Maranhão",
  TJMG: "Tribunal de Justiça de Minas Gerais",
  TJMS: "Tribunal de Justiça de Mato Grosso do Sul",
  TJMT: "Tribunal de Justiça de Mato Grosso",
  TJPA: "Tribunal de Justiça do Pará",
  TJPB: "Tribunal de Justiça da Paraíba",
  TJPE: "Tribunal de Justiça de Pernambuco",
  TJPI: "Tribunal de Justiça do Piauí",
  TJPR: "Tribunal de Justiça do Paraná",
  TJRJ: "Tribunal de Justiça do Rio de Janeiro",
  TJRN: "Tribunal de Justiça do Rio Grande do Norte",
  TJRO: "Tribunal de Justiça de Rondônia",
  TJRR: "Tribunal de Justiça de Roraima",
  TJRS: "Tribunal de Justiça do Rio Grande do Sul",
  TJSC: "Tribunal de Justiça de Santa Catarina",
  TJSE: "Tribunal de Justiça de Sergipe",
  TJSP: "Tribunal de Justiça de São Paulo",
  TJTO: "Tribunal de Justiça do Tocantins",

  // Tribunais Regionais Federais
  TRF1: "Tribunal Regional Federal da 1ª Região",
  TRF2: "Tribunal Regional Federal da 2ª Região",
  TRF3: "Tribunal Regional Federal da 3ª Região",
  TRF4: "Tribunal Regional Federal da 4ª Região",
  TRF5: "Tribunal Regional Federal da 5ª Região",
  TRF6: "Tribunal Regional Federal da 6ª Região",

  // Tribunais Regionais do Trabalho
  TRT1: "Tribunal Regional do Trabalho da 1ª Região",
  TRT2: "Tribunal Regional do Trabalho da 2ª Região",
  TRT3: "Tribunal Regional do Trabalho da 3ª Região",
  TRT4: "Tribunal Regional do Trabalho da 4ª Região",
  TRT5: "Tribunal Regional do Trabalho da 5ª Região",
  TRT6: "Tribunal Regional do Trabalho da 6ª Região",
  TRT7: "Tribunal Regional do Trabalho da 7ª Região",
  TRT8: "Tribunal Regional do Trabalho da 8ª Região",
  TRT9: "Tribunal Regional do Trabalho da 9ª Região",
  TRT10: "Tribunal Regional do Trabalho da 10ª Região",
  TRT12: "Tribunal Regional do Trabalho da 12ª Região",
  TRT13: "Tribunal Regional do Trabalho da 13ª Região",
  TRT14: "Tribunal Regional do Trabalho da 14ª Região",
  TRT15: "Tribunal Regional do Trabalho da 15ª Região",
  TRT16: "Tribunal Regional do Trabalho da 16ª Região",
  TRT17: "Tribunal Regional do Trabalho da 17ª Região",
  TRT18: "Tribunal Regional do Trabalho da 18ª Região",
  TRT19: "Tribunal Regional do Trabalho da 19ª Região",
  TRT20: "Tribunal Regional do Trabalho da 20ª Região",
  TRT21: "Tribunal Regional do Trabalho da 21ª Região",
  TRT22: "Tribunal Regional do Trabalho da 22ª Região",
  TRT23: "Tribunal Regional do Trabalho da 23ª Região",
  TRT24: "Tribunal Regional do Trabalho da 24ª Região",
};

export const DEGREES = {
  "1ª Instância": "1ª Instância",
  "2ª Instância": "2ª Instância",
  "Tribunal Superior": "Tribunal Superior",
  Administrativo: "Administrativo",
};

export const DOCUMENT_TYPES = {
  Acórdão: "Acórdão",
  "Decisão Monocrática": "Decisão Monocrática",
  "Não identificado": "Não identificado",
  Admissibilidade: "Admissibilidade",
  Sentença: "Sentença",
  Decisão: "Decisão",
  Despacho: "Despacho",
  "Dúvida de Competência": "Dúvida de Competência",
};

export const JUSTICE_TYPES = {
  "Juízo Comum": "Juízo Comum",
  "Juizado Especial": "Juizado Especial",
};

export const SEARCH_OPERATORS = {
  AND: "E",
  OR: "OU",
  NOT: "MASNAO",
  EXACT: '"termo exato"',
  PARENTHESES: "()",
};

export const SEARCH_FIELDS = {
  title: "Título",
  headnote: "Ementa",
  full_text: "Inteiro Teor",
};

export const SORT_OPTIONS = {
  juridical_relevance: { field: ["ranking_ijr", "juit_id"], direction: ["desc", "desc"] },
  relevance: { field: ["score", "juit_id"], direction: ["desc", "desc"] },
  newest: { field: ["order_date", "juit_id"], direction: ["desc", "desc"] },
  oldest: { field: ["order_date", "juit_id"], direction: ["asc", "desc"] },
};
