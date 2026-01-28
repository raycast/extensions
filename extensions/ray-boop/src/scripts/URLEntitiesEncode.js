/**
    {
        "api":1,
        "name":"URL Entity Encode",
        "description":"URL Encodes all characters in your text.",
        "author":"luisfontes19",
        "icon":"percentage",
        "tags":"url,encode,full",
        "bias": -0.1
    }
**/

function fullUrlEncode(str) {
  var encoded = "";

  for (var i = 0; i < str.length; i++) {
    var h = parseInt(str.charCodeAt(i)).toString(16);
    encoded += "%" + h;
  }

  return encoded;
}

export function main(state) {
  state.text = fullUrlEncode(state.text);
}
