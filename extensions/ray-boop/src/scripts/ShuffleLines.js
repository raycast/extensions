/**
	{
		"api":1,
		"name":"Shuffle Lines",
		"description":"Randomize each line of your text.",
		"author":"@Clarko",
		"icon":"dice",
		"tags":"shuffle,random"
	}
**/

export function main(input) {
  let lines = input.text.split("\n");
  let j = lines.length;

  // Fisher-Yates Shuffle
  let i, temp;
  while (j) {
    i = Math.floor(Math.random() * j--);
    temp = lines[j];
    lines[j] = lines[i];
    lines[i] = temp;
  }

  input.text = lines.join("\n");
}
