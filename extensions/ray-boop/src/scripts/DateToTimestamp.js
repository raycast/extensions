/**
    {
        "api":1,
        "name":"Date to Timestamp",
        "description":"Converts dates to Unix timestamp.",
        "author":"Noah Halford",
        "icon":"watch",
        "tags":"date,time,calendar,unix,timestamp"
    }
**/

export function main(input) {
  let parsedDate = Date.parse(input.text);
  if (isNaN(parsedDate)) {
    input.postError("Invalid Date");
  } else {
    input.text = parsedDate / 1000;
  }
}
