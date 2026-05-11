/**
  {
    "api":1,
    "name":"Refang",
    "description":"Removes defanging from dangerous URLs and other IOCs",
    "author":"Ross",
    "icon":"link",
    "tags":"refang,url,ioc"
  }
**/

export function main(input) {
  let url = input.text;
  url = url.replace(/\[\.\]/g, ".");
  url = url.replace(/hXXp/gi, "http");
  url = url.replace(/\[:\/\/\]/g, "://");
  input.text = url;
}
