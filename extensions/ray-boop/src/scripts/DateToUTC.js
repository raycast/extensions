/**
	{
		"api":1,
		"name":"Date to UTC",
		"description":"Converts dates and timestamps to UTC dates",
		"author":"Ivan",
		"icon":"watch",
		"tags":"date,time,calendar,unix,timestamp"
	}
**/

export function main(input) {
  let string = input.text;

  let parsedDate = Date.parse(string);

  if (isNaN(parsedDate)) {
    parsedDate = new Date(parseInt(string * 1000));
  } else {
    parsedDate = new Date(parsedDate);
  }

  let out = parsedDate.toUTCString();

  if (out === "Invalid Date") {
    input.postError(out);
    return;
  }

  input.text = out;
}
