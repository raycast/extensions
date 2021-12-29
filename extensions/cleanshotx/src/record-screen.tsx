var nrc = require('node-run-cmd');

export default async() => {
  const url = "cleanshot://record-screen";
  nrc.run(`open ${url}`);
}
