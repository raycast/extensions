/**
{
  "api": 1,
  "name": "Calculate Size (Bytes)",
  "description": "Calculates size of text in Bytes",
  "author": "zzz",
  "icon": "counter",
  "tags": "calc,size,bytes,storage"
}
**/

//From https://stackoverflow.com/a/12206089
function getUTF8Length(s) {
  var len = 0;
  for (var i = 0; i < s.length; i++) {
    var code = s.charCodeAt(i);
    if (code <= 0x7f) {
      len += 1;
    } else if (code <= 0x7ff) {
      len += 2;
    } else if (code >= 0xd800 && code <= 0xdfff) {
      // Surrogate pair: These take 4 bytes in UTF-8 and 2 chars in UCS-2
      // (Assume next char is the other [valid] half and just skip it)
      len += 4;
      i++;
    } else if (code < 0xffff) {
      len += 3;
    } else {
      len += 4;
    }
  }
  return len;
}

export function main(input) {
  let bytes = getUTF8Length(input.text);
  if (bytes > 1000000) {
    bytes /= 1000000;
    input.postInfo(`${bytes.toFixed(2)} Mb`);
  }
  if (bytes > 100000) {
    bytes /= 1000;
    input.postInfo(`${bytes.toFixed(2)} Kb`);
  } else {
    input.postInfo(`${bytes} bytes`);
  }
}
