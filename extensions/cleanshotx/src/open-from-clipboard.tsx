var nrc = require('node-run-cmd');

export default async() => {
  const url = "cleanshot://open-from-clipboard";
  nrc.run(`open ${url}`);
}
