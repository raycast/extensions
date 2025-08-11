export const BRAZILIAN_STATES = [
  { title: "Indiferente", value: "" },
  { title: "Acre (AC)", value: "AC" },
  { title: "Alagoas (AL)", value: "AL" },
  { title: "Amapá (AP)", value: "AP" },
  { title: "Amazonas (AM)", value: "AM" },
  { title: "Bahia (BA)", value: "BA" },
  { title: "Ceará (CE)", value: "CE" },
  { title: "Distrito Federal (DF)", value: "DF" },
  { title: "Espírito Santo (ES)", value: "ES" },
  { title: "Goiás (GO)", value: "GO" },
  { title: "Maranhão (MA)", value: "MA" },
  { title: "Mato Grosso (MT)", value: "MT" },
  { title: "Mato Grosso do Sul (MS)", value: "MS" },
  { title: "Minas Gerais (MG)", value: "MG" },
  { title: "Pará (PA)", value: "PA" },
  { title: "Paraíba (PB)", value: "PB" },
  { title: "Paraná (PR)", value: "PR" },
  { title: "Pernambuco (PE)", value: "PE" },
  { title: "Piauí (PI)", value: "PI" },
  { title: "Rio de Janeiro (RJ)", value: "RJ" },
  { title: "Rio Grande do Norte (RN)", value: "RN" },
  { title: "Rio Grande do Sul (RS)", value: "RS" },
  { title: "Rondônia (RO)", value: "RO" },
  { title: "Roraima (RR)", value: "RR" },
  { title: "Santa Catarina (SC)", value: "SC" },
  { title: "São Paulo (SP)", value: "SP" },
  { title: "Sergipe (SE)", value: "SE" },
  { title: "Tocantins (TO)", value: "TO" },
];

export const CARD_BRANDS = [
  { title: "Visa", value: "visa" },
  { title: "MasterCard", value: "mastercard" },
  { title: "American Express", value: "amex" },
  { title: "Diners Club", value: "diners" },
  { title: "Discover", value: "discover" },
  { title: "JCB", value: "jcb" },
  { title: "Elo", value: "elo" },
  { title: "Hiper", value: "hiper" },
  { title: "Aura", value: "aura" },
];

export const CERTIDAO_TYPES = [
  { title: "Nascimento", value: "nascimento" },
  { title: "Casamento", value: "casamento" },
  { title: "Casamento com Efeito Religioso", value: "casamento_religioso" },
  { title: "Óbito", value: "obito" },
];

export const HISTORY_STORAGE_KEY = "4devs-toolkit-history";
export const FAVORITES_STORAGE_KEY = "4devs-toolkit-favorites";
export const MAX_HISTORY_ITEMS = 100;
export const MAX_BATCH_GENERATION = 50;

export const DISCLAIMER = `
⚠️ **AVISO LEGAL IMPORTANTE**

Esta extensão gera documentos válidos EXCLUSIVAMENTE para fins de TESTE e DESENVOLVIMENTO de software.

**É EXPRESSAMENTE PROIBIDO** utilizar os documentos gerados para:
- Fraudes ou atividades ilegais de qualquer natureza
- Cadastros em sistemas reais ou produção
- Falsificação de documentos ou identidade
- Qualquer atividade que não seja teste de software em ambiente controlado

O uso indevido dos documentos gerados é de responsabilidade exclusiva do usuário e pode resultar em consequências legais graves.
`;

export const ExportFormat = {
  JSON: "json",
  CSV: "csv",
  TEXT: "text",
} as const;

export type ExportFormatType = (typeof ExportFormat)[keyof typeof ExportFormat];
