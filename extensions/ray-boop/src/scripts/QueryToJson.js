/**
	{
		"api":1,
		"name":"Query String to JSON",
		"description":"Converts URL query string to JSON.",
		"author":"Ota Mares <ota@mares.one>",
		"icon":"website",
		"tags":"url,query,params,json,convert,decode"
	}
**/

function convertToJson(urlParams) {
  return urlParams
    .replace(/\[\d?\]=/gi, "=")
    .split("&")
    .reduce((result, param) => {
      var [key, value] = param.split("=");
      value = decodeURIComponent(value || "");

      if (!Object.prototype.hasOwnProperty.call(result, key)) {
        result[key] = value;

        return result;
      }

      result[key] = [...[].concat(result[key]), value];

      return result;
    }, {});
}

export function main(input) {
  try {
    input.text = JSON.stringify(convertToJson(input.text));
  } catch {
    input.postError("Unable to parse given string");
  }
}
