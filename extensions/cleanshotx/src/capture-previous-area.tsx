var nrc = require('node-run-cmd');

export default async() => {
  const url = "cleanshot://capture-previous-area";
  nrc.run(`open ${url}`);
}
