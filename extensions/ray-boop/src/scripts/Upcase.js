/**
    {
        "api":1,
        "name":"Upcase",
        "description":"Converts your text to uppercase.",
        "author":"Dan2552",
        "icon":"type",
        "tags":"upcase,uppercase,capital,capitalize,capitalization"
    }
**/

export function main(input) {
  input.text = input.text.toUpperCase();
}
