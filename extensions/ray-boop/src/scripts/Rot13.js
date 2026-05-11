/**
  {
    "api":1,
    "name":"Rot13",
    "description":"Applies the Rot13 cypher to your text.",
    "author":"Paul Starr",
    "icon":"roman",
    "tags":"spoilers,encryption,plaintext"
  }
**/

export function main(state) {
  let myText = state.text;
  // adapted from Sophie Alpert's solution: https://stackoverflow.com/questions/617647/where-is-my-implementation-of-rot13-in-javascript-going-wrong
  state.text = myText.replace(/[a-z]/gi, function (c) {
    return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
  });
  return state;
}
