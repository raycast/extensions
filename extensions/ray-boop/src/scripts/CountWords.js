/**
  {
    "api":1,
    "name":"Count Words",
    "description":"Get the word count of your text",
    "author":"Daniel Stone",
    "icon":"counter",
    "tags":"count,length,size,words"
  }
**/
export function main(input) {
  let words = input.text.trim().match(/\S+/g);
  input.postInfo(`${(words && words.length) || 0} words`);
}
