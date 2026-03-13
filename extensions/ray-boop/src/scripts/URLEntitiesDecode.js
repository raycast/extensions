/**
	{
		"api":1,
		"name":"URL Entities Decode",
		"description":"URL Decodes all characters in your text.",
		"author":"luisfontes19",
		"icon":"percentage",
		"tags":"url,decode,full",
        "bias": -0.1
	}
**/

function fullUrlDecode(str) {
  var codes = str.split("%");
  var decoded = "";

  for (var i = 0; i < codes.length; i++) {
    decoded += String.fromCharCode(parseInt(codes[i], 16));
  }

  return decoded;
}

export function main(state) {
  state.text = fullUrlDecode(state.text);
}
