/**
{
  "api": 1,
  "name": "Generate hashtag",
  "description": "Generate hashtag from a word or sentence",
  "author": "Armand Salle",
  "icon": "metamorphose",
  "tags": "hashtag,word"
}
**/

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function createHashtag(str) {
  if (str === "") {
    throw new Error("Invalid text :(");
  } else {
    const result = str.replace(/\n+/gm, " ");
    const text = result.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9\s]+/gm, " ");

    return "#" + text.toLowerCase().split(" ").map(capitalize).join("");
  }
}

export function main(input) {
  try {
    const generatedHashatag = createHashtag(input.text);
    input.text = generatedHashatag;
    input.postInfo("Nice!");
  } catch (e) {
    input.postError(e.message);
  }
}
