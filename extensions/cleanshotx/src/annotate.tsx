var nrc = require('node-run-cmd');

export default async() => {
  const url = "cleanshot://open-annotate";
  nrc.run(`open ${url}`);
}
