function toHTMLEntities(str: string) {
  return str.replace(/./gm, function (s) {
    return "&#" + s.charCodeAt(0) + ";";
  });
}

function getSvgWithKaomoji(kaomoji: string, dark = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" >
  <text dominant-baseline="middle" x="45" y="45" text-anchor="middle" fill="${
    dark ? "#fff" : "#000"
  }" font-size="8px" text-length="90" length-adjust="spacing">
    ${toHTMLEntities(kaomoji)}
  </text>
</svg>`;
}

export function getBase64SvgUrl(kaomoji: string, dark = false) {
  return "data:image/svg+xml;base64," + Buffer.from(getSvgWithKaomoji(kaomoji, dark)).toString("base64");
}
