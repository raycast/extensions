/**
     {
         "api":1,
         "name":"Hex to RGB",
         "description":"Convert color in hexadecimal to RGB.",
         "author":"Venkat",
         "icon":"color-wheel",
         "tags":"hex,color,rgb,convert"
     }
 **/

export function main(input) {
  const R = hexToR(input.text);
  const G = hexToG(input.text);
  const B = hexToB(input.text);

  input.text = R.toString().concat(",").concat(G.toString()).concat(",").concat(B.toString());
}

function hexToR(h) {
  return parseInt(cutHex(h).substring(0, 2), 16);
}
function hexToG(h) {
  return parseInt(cutHex(h).substring(2, 4), 16);
}
function hexToB(h) {
  return parseInt(cutHex(h).substring(4, 6), 16);
}
function cutHex(h) {
  return h.charAt(0) == "#" ? h.substring(1, 7) : h;
}
