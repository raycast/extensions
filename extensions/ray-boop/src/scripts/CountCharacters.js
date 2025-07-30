/**
	{
		"api":1,
		"name":"Count Characters",
		"description":"Get the length of your text",
		"author":"Ivan",
		"icon":"counter",
		"tags":"count,length,size,character"
	}
**/

export function main(input) {
  const count = input.text.length;
  input.postInfo(`${count} characters`);
}
