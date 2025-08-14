/**
	{
		"api":1,
		"name":"Test Script",
		"description":"Testing script",
		"author":"Ivan",
		"icon":"flask",
		"tags":"test,test,one,two"
	}
**/

export function main(input) {
  input.postInfo("Hello this is a test!");

  input.text = `Hello, World! Let's try some syntax highlighting shall we?

var test: String? = "Toast"

{
    "name": "Boop",
    "type": "software",
    "info": {
        "tags": ["software", "editor"]
    },
    "useful": false,
    "version": 1.2345e-10
}

The MD5 of \`truth\` is 68934a3e9455fa72420237eb05902327
    
SELECT "Hello" FROM table LIMIT 2

/*
 haha you can't see me 👻
*/
    
if(false) return;  // this doesn't work
    
This line was added on Fri, 19 Jun 2020 01:01:30 GMT
    
<div class="hello">World</div>

"This is quote-unquote \\"escaped\\" if you will."
`;
}
