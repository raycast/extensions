/**
{
    "api":1,
    "name":"CSV to JSON (headerless)",
    "description":"Converts comma-separated, headerless tables to JSON.",
    "author":"Flare576",
    "icon":"table",
    "tags":"table,convert",
    "bias": -0.2
}
 **/
import Papa from "papaparse";

export function main(state) {
  try {
    const { data } = Papa.parse(state.text, { header: false });
    state.text = JSON.stringify(data, null, 2);
  } catch (error) {
    state.text = error;
    state.postError("Invalid CSV");
  }
}
