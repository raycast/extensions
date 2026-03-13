/**
  {
    "api":1,
    "name":"JWT Decode",
    "description":"Converts JWTs to JSON",
    "author":"Nils Sonemann",
    "icon":"identification",
    "tags":"decode,jwt,token"
  }
**/

export function main(input) {
  var t = input.text;
  var jwtParts = t.split(".");
  if (jwtParts.length != 3) {
    input.postError("Invalid Token");
    return;
  }

  var header = Buffer.from(jwtParts[0], "base64").toString("utf8");
  var payload = Buffer.from(jwtParts[1], "base64").toString("utf8");
  var signature = jwtParts[2];

  try {
    var fullJson = {
      header: JSON.parse(header),
      payload: JSON.parse(payload),
      signature: signature,
    };

    // Prettyprint the JSOM
    input.text = JSON.stringify(fullJson, null, 2);
  } catch {
    input.postError("Error while parsing JSON");
  }
}
