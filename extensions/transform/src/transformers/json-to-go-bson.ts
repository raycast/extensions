export const TransformJSONtoGoBson = {
  from: "JSON",
  to: "Go Bson",
  transform: (value: string) =>
    JSON.stringify(JSON.parse(value || "{}"), null, 2)
      .replace(/\{/gm, "bson.M{")
      .replace(/\[/gm, "bson.A{")
      .replace(/\]/gm, "}")
      .replace(/(\d|\w|")$/gm, "$1,")
      .replace(/(\}$)(\n)/gm, "$1,$2"),
};
