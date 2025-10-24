export default (txt: string) => encodeURI(txt.substring(0, 256).trim());
