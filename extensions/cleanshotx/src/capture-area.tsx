var nrc = require('node-run-cmd');

export default async() => {
  const url = "cleanshot://capture-area";
  nrc.run(`open ${url}`);
}
