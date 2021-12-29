var nrc = require('node-run-cmd');

export default async() => {
  const url = "cleanshot://restore-recently-closed";
  nrc.run(`open ${url}`);
}
