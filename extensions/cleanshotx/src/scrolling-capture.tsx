var nrc = require('node-run-cmd');

export default async() => {
  const url = "cleanshot://scrolling-capture";
  nrc.run(`open ${url}`);
}
