/**
	{
		"api":1,
		"name":"Count Lines",
		"description":"Get the line count of your text",
		"author":"andipaetzold",
		"icon":"counter",
		"tags":"count,length,size,line"
	}
**/

export function main(input) {
  input.postInfo(`${input.text.split("\n").length} lines`);
}
