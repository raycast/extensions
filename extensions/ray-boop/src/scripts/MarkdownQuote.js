/**
    {
        "api":1,
        "name":"Markdown Quote",
        "description":"Adds > to the start of every line of your text.",
        "author":"Dan2552",
        "icon":"term",
        "tags":"quote,markdown"
    }
**/

export function main(input) {
  input.text = input.text
    .split("\n")
    .map((line) => "> " + line)
    .join("\n");
}
