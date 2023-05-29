const base64_decode = (str: string): string => Buffer.from(str, "base64").toString("utf8");
const url_decode = (str: string): string => decodeURIComponent(str);

const base64_encode = (str: string): string => Buffer.from(str, "binary").toString("base64");
const url_encode = (str: string): string => encodeURIComponent(str);

class Processor {
  name: string;
  func: (str: string) => string;

  constructor(name: string, func: (str: string) => string) {
    this.name = name;
    this.func = func;
  }
}

// decode first
const processors: Processor[] = [
  new Processor("Base64 Decode", base64_decode),
  new Processor("Base64 Encode", base64_encode),
  new Processor("URL Decode", url_decode),
  new Processor("URL Encode", url_encode),
];

const run_all_processors = (str: string): string[][] => {
  const ret = processors.flatMap((processor: Processor) => {
    try {
      return [[processor.name, processor.func(str)]];
    } catch (e) {
      return [[processor.name, ""]];
    }
  });
  return ret;
};

export default run_all_processors;
