/**
    {
        "api":1,
        "name":"Collapse Whitespace",
        "description":"Collapses consecutive whitespace into a single space",
        "author":"Boop Community",
        "icon":"collapse",
        "tags":"collapse,whitespace,clean"
    }
**/

export function main(input) {
  input.text = input.text.replace(/\s+/gu, " ").trim();
}
