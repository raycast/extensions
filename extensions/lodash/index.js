const fs = require("fs");
const { parse } = require("jsdoc-parse-plus");

// read files in the directory called 'repo'
const files = fs.readdirSync("repo");

// get file contents
const contents = files
  .map((file) => [fs.readFileSync(`repo/${file}`, "utf8"), file])
  .map(([x, file]) => {
    const metadata = parse(x);
    return {
      name: file.replace(".js", ""),
      category: metadata.category.value,
      description: metadata.description.value,
      since: metadata.since.value,
      examples: metadata.example.map((x) => x.value),
      params: (metadata.param ? metadata.param : []).map((x) => ({
        name: x.name,
        type: x.type,
        description: x.description,
        defaultValue: x.defaultValue,
        optional: x.optional,
      })),
      returns: metadata.returns
        ? {
            type: metadata.returns.type,
            description: metadata.returns.description,
          }
        : null,
    };
  });

// write to a file
fs.writeFileSync("lodash.json", JSON.stringify(contents, null, 2));
