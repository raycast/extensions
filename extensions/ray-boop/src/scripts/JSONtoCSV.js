/**
	{
		"api":1,
		"name":"JSON to CSV",
		"description":"Converts JSON to comma-separated tables.",
		"author":"Ivan",
		"icon":"table",
		"tags":"table,convert",
        "bias": -0.2
	}
**/

// Inspired by https://stackoverflow.com/a/31536517/2053038
// Note: it would be good to escape commas, and maybe not just get keys from the first object.

export function main(state) {
  try {
    const delimiter = ",";
    const data = JSON.parse(state.text);
    const replacer = (_, value) => (value === null ? "" : value);
    const header = Object.keys(data[0]);
    let csv = data.map((row) => header.map((fieldName) => JSON.stringify(row[fieldName], replacer)).join(delimiter));
    csv.unshift(header.join(delimiter));
    state.text = csv.join("\r\n");
  } catch {
    state.postError("Invalid JSON.");
  }
}
