var nrc = require('node-run-cmd');

export default async() => {
  const url = "cleanshot://self-timer";
  nrc.run(`open ${url}`);
}
