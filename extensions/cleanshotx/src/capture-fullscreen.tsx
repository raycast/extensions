var nrc = require('node-run-cmd');

export default async() => {
  const url = "cleanshot://capture-fullscreen";
  nrc.run(`open ${url}`);
}
