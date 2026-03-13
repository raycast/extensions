/**
    {
        "api":1,
        "name":"Lorem Ipsum",
        "description":"Generates Lorem Ipsum placeholder text.",
        "author":"luisfontes19",
        "icon":"type",
        "tags":"generate,lorem,ipsum,text",
        "bias": -0.1
    }
**/

export function main(state) {
  const words = [
    "ad",
    "adipisicing",
    "aliqua",
    "aliquip",
    "amet",
    "anim",
    "aute",
    "cillum",
    "commodo",
    "consectetur",
    "consequat",
    "culpa",
    "cupidatat",
    "deserunt",
    "do",
    "dolor",
    "dolore",
    "duis",
    "ea",
    "eiusmod",
    "elit",
    "enim",
    "esse",
    "est",
    "et",
    "eu",
    "ex",
    "excepteur",
    "exercitation",
    "fugiat",
    "id",
    "in",
    "incididunt",
    "ipsum",
    "irure",
    "labore",
    "laboris",
    "laborum",
    "Lorem",
    "magna",
    "minim",
    "mollit",
    "nisi",
    "non",
    "nostrud",
    "nulla",
    "occaecat",
    "officia",
    "pariatur",
    "proident",
    "qui",
    "quis",
    "reprehenderit",
    "sint",
    "sit",
    "sunt",
    "tempor",
    "ullamco",
    "ut",
    "velit",
    "veniam",
    "voluptate",
  ];
  let sentence = "";

  for (let i = 0; i < 100; i++) {
    const pos = Math.floor(Math.random() * (words.length - 1));
    sentence += words[pos] + " ";
  }

  sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1).trim() + ".";

  state.text = sentence;
}
