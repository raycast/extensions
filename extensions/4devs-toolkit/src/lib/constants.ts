export const BRAZILIAN_STATES = [
  { title: "Any State", value: "" },
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
  { title: "Birth", value: "nascimento" },
  { title: "Marriage", value: "casamento" },
  { title: "Religious Marriage", value: "casamento_religioso" },
  { title: "Death", value: "obito" },
];

export const HISTORY_STORAGE_KEY = "4devs-toolkit-history";
export const FAVORITES_STORAGE_KEY = "4devs-toolkit-favorites";
export const MAX_HISTORY_ITEMS = 100;
export const MAX_BATCH_GENERATION = 50;

export const DISCLAIMER = `
⚠️ **IMPORTANT LEGAL NOTICE**

This extension generates valid documents EXCLUSIVELY for SOFTWARE TESTING and DEVELOPMENT purposes.

**IT IS STRICTLY PROHIBITED** to use the generated documents for:
- Fraud or illegal activities of any kind
- Registration in real or production systems
- Document or identity forgery
- Any activity other than software testing in a controlled environment

Misuse of generated documents is the sole responsibility of the user and may result in serious legal consequences.
`;

export const ExportFormat = {
  JSON: "json",
  CSV: "csv",
  TEXT: "text",
} as const;

export type ExportFormatType = (typeof ExportFormat)[keyof typeof ExportFormat];
