var nrc = require('node-run-cmd');

export default async() => {
  const url = "cleanshot://toggle-desktop-icons";
  nrc.run(`open ${url}`);
}
