var nrc = require('node-run-cmd');

export default async() => {
  const url = "cleanshot://capture-text";
  nrc.run(`open ${url}`);
}
