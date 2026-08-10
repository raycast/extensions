import { getPreferenceValues } from "@raycast/api";
import { DeckResponse, DecksResponse, Field, FormFieldsData, TemplateResponse } from "../types";
import * as LocalStorage from "./LocalStorage";
import fetch from "node-fetch";
import { ACTIVE_DECKS_KEY } from "../constants";

type Preferences = {
  apiKey: string;
};
const preferences = getPreferenceValues<Preferences>();
const headers = {
  Authorization: `Basic ${Buffer.from(`${preferences.apiKey}:`).toString("base64")}`,
  "Content-Type": "application/json",
};

export const fetchFormDataAndCache = async (deckId: string) => {
  const formattedDeckId = deckId.replace(/[[\]]/g, "");
  const res = await fetch(`https://app.mochi.cards/api/decks/${formattedDeckId}`, {
    headers,
  });
  if (res.status !== 200) {
    throw new Error("Failed to fetch data");
  }
  const deckData = (await res.json()) as DeckResponse;

  // If template id is not set, don't call templates endpoint
  let formData = null;
  if (!deckData["template-id"]) {
    formData = {
      deckId: deckData.id,
      deckName: deckData.name,
      templateId: null,
      content: "",
      fields: [] as Field[],
    };
  } else {
    const templatesRes = await fetch(`https://app.mochi.cards/api/templates/${deckData["template-id"]}`, {
      headers,
    });
    const templatesData = (await templatesRes.json()) as TemplateResponse;
    formData = {
      deckId: deckData.id,
      deckName: deckData.name,
      templateId: templatesData.id,
      content: templatesData.content,
      fields: Object.values(templatesData.fields)
        .filter((field) => field.type === "text" || field.type === "boolean")
        .map((field) => ({
          id: field.id,
          name: field.name,
          type: field.type,
          multiline: field.options && field.options["multi-line?"],
          defaultCheck: field.options && !!field.options["boolean-default"],
        })),
    };
  }
  LocalStorage.setItem(deckId, formData);
  return formData;
};

export const fetchDecksAndCache = async () => {
  const res = await fetch("https://app.mochi.cards/api/decks", {
    method: "GET",
    headers,
  });
  if (res.status !== 200) {
    throw new Error("Failed to fetch data");
  }
  const data = (await res.json()) as DecksResponse;
  const ActiveDecks = data.docs.filter((d) => !d["archived?"] && !d["trashed?"]).sort((a, b) => a.sort - b.sort);
  LocalStorage.setItem(ACTIVE_DECKS_KEY, ActiveDecks);
  return ActiveDecks;
};

export const postCard = async (values: Record<string, string>, formData: FormFieldsData) => {
  let params: Record<string, unknown> = {};

  if (formData.templateId && formData.fields.length) {
    // If has template
    const fields = Object.entries(values).reduce<Record<string, { id: string; value: string }>>((acc, [key, value]) => {
      acc[key] = { id: key, value };
      return acc;
    }, {});

    params = {
      content: formData.content,
      "deck-id": formData.deckId,
      "template-id": formData.templateId,
      fields,
    };
  } else {
    // If hasn't template
    params = {
      content: values.content,
      "deck-id": formData.deckId,
    };
  }

  const body = JSON.stringify(params);

  await fetch("https://app.mochi.cards/api/cards", {
    method: "POST",
    headers,
    body,
  });
};
