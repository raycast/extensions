import MarkDown from '@tree-sitter-grammars/tree-sitter-markdown';
import fs from "fs";
import mjAPI from "mathjax-node";
import Parser from 'tree-sitter';

mjAPI.config({
  MathJax: {
    // traditional MathJax configuration
  },
});
mjAPI.start();

async function generateMathJaxImage(equation, inline = false) {
  const height = inline ? 24 : 48;
  const newline_or_empty = inline ? "" : "\n";
  return new Promise((resolve, reject) => {
    mjAPI.typeset(
      {
        math: equation,
        format: "TeX",
        svg: true,
      },
      (data) => {
        if (data.svg) {
          resolve(
            `${newline_or_empty}![equation](data:image/svg+xml;base64,${Buffer.from(data.svg).toString(
              "base64"
            )}?raycast-height=${height})${newline_or_empty}`
          );
        } else {
          reject("Failed to generate MathJax image");
        }
      }
    );
  });
}

async function main(path) {
  // read from local file
  let inputStream = fs.readFileSync(path, "utf8");

  // block parser
  const parser = new Parser();
  parser.setLanguage(MarkDown);
  const tree = parser.parse(inputStream);

  var res = inputStream;
  const promises = [];
  const ranges = [];
  // inline parser
  parser.setLanguage(MarkDown.inline);
  const query = new Parser.Query(MarkDown, '[(inline)(pipe_table_cell)] @inline');
  const matches = query.matches(tree.rootNode);
  // for each inline block, further parse to find latex block
  matches.reverse().forEach(match => {
    const node = match.captures[0].node;
    const inlineTree = parser.parse(node.text);
    const inlineQuery = new Parser.Query(
      MarkDown.inline,
      '(latex_block (latex_span_delimiter) @delimiter (latex_span_delimiter)) @math'
    );
    const inlineMatches = inlineQuery.matches(inlineTree.rootNode);
    inlineMatches.reverse().forEach(inlineMatch => {
      const inlineNode = inlineMatch.captures[0].node;
      // delimiter's length == 1, means `$`, inline equation
      const del_len = inlineMatch.captures[1].node.text.length;
      ranges.push({
        start: inlineNode.startIndex + node.startIndex,
        end: inlineNode.endIndex + node.startIndex
      });
      promises.push(Promise.resolve(generateMathJaxImage(inlineNode.text.slice(del_len, -del_len), del_len == 1)));
    })
  })
  const results = await Promise.all(promises);
  for (const result of results) {
    const range = ranges.shift();
    res = res.substring(0, range.start) + result + res.substring(range.end);
  }
  console.log(res);
}

main(process.argv[2]);
