// eslint-disable-next-line @typescript-eslint/no-var-requires
const jsonToGoJs = require("./js");

const jsonToGo = (input: string) => {
  const got = jsonToGoJs(input, null, null, false);
  if (got.error) {
    return "Invalid JSON";
  }
  return got.go;
};

export default jsonToGo;
