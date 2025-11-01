/**
	{
		"api":1,
		"name":"Sum All",
		"description":"Sums up a list of numbers.",
		"author":"Annie Tran",
		"icon":"abacus",
		"tags":"sum,calculator,addition,add"
	}
**/

export function main(input) {
  if (!input.text) {
    input.postError("");
  } else {
    input.text = calculate(input.text);
  }
}

function looksLikeFraction(s) {
  return /^[\d.]+\/[\d.]+$/.test(s);
}

function getFraction(s) {
  const frac = s.split("/");
  return frac[0] / frac[1];
}

function getNumber(s) {
  if (looksLikeFraction(s)) {
    return getFraction(s);
  }
  return isNaN(Number(s)) ? "" : Number(s);
}

function numStringToArray(s) {
  return s
    .replace(/\/\/.*/g, "")
    .split(/[\n\s,;=]/g)
    .map((e) => (getNumber(e) ? getNumber(e) : ""))
    .filter(Boolean);
}

function calculate(s) {
  const comment = "\t// ";
  const numbers = numStringToArray(s);

  var sumOutput = numbers.reduce((a, b) => a + b);

  if (numbers.length > 1) {
    sumOutput += comment + numbers.join(" + ");
  }

  return s
    .split(/[\n,;]/g)
    .map((e) => {
      e = e.trim();
      if (e.charAt(0) === "=" || e === "" || e.toString() === Number(e).toString()) {
        return e;
      }
      return `${e}${getNumber(e) && comment + getNumber(e)}`;
    })
    .concat("\n= " + sumOutput)
    .join("\n");
}
