var nrc = require('node-run-cmd');

export default async() => {
  const url = "cleanshot://capture-window";
  nrc.run(`open ${url}`);
}
