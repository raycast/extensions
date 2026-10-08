/**
	{
		"api":1,
		"name":"JSON to Query String",
		"description":"Converts JSON to URL query string.",
		"author":"Ota Mares <ota@mares.one>",
		"icon":"website",
		"tags":"url,query,params,json,convert,encode"
	}
**/

/**
 * Credit goes to https://stackoverflow.com/a/1714899
 */
function convertToQuery(obj, prefix) {
  let queryParts = [];

  for (const param in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, param)) {
      let key = prefix ? prefix + "[]" : param;
      let value = obj[param];

      queryParts.push(value !== null && typeof value === "object" ? convertToQuery(value, key) : key + "=" + value);
    }
  }

  return queryParts.join("&");
}

export function main(input) {
  try {
    input.text = convertToQuery(JSON.parse(input.text));
  } catch {
    input.postError("Unable to convert JSON to URL params");
  }
}
