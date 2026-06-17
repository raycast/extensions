/**
	{
		"api":1,
		"name":"ASCII To Hex",
		"description":"Converts ASCII characters to hexadecimal codes.",
		"author":"aWZHY0yQH81uOYvH",
		"icon":"metamorphose",
		"tags":"ascii,hex,convert"
	}
**/

export function main(state) {
  let buf = "";
  for (let i = 0; i < state.text.length; i++) {
    let code = state.text.charCodeAt(i).toString(16);
    if (code.length < 2) buf += "0";
    buf += code;
  }
  state.text = buf.toUpperCase();
}
