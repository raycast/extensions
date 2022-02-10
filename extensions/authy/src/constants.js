exports.icondir = "icons";

const logos = {
  amazon: [],
  aws: ["amazonaws"],
  authy: [],
  bitcoin: [],
  circle: [],
  cloudflare: [],
  coinbase: [],
  dashlane: [],
  digitalocean: [],
  discord: [],
  dropbox: [],
  ea: [],
  evernote: [],
  facebook: [],
  github: [],
  gmail: [],
  google: ["google apps"],
  heroku: [],
  hootsuite: [],
  hubspot: [],
  ifttt: [],
  kickstarter: [],
  lastpass: [],
  linode: [],
  logmein: [],
  mailchimp: [],
  microsoft: [],
  okta: [],
  salesforce: [],
  slack: [],
  snapchat: [],
  stripe: [],
  teamviewer: [],
  tumblr: [],
  twitch: [],
  twitter: [],
  wordpress: [],
  npm: [],
  twilio: [],
  synology: [],
  namecheap: [],
};

exports.logos = [...Object.keys(logos), ...Object.values(logos).flat()];

// build reverse mapping of aliases to icon once at runtime
exports.logoAliases = Object.entries(logos).reduce((acc, [key, value]) => {
  if (value.length) {
    for (const alias of value) {
      acc[alias] = key;
    }
  }
  return acc;
}, {});

exports.genericColors = [
  { name: "black", value: "#464646" },
  { name: "blue", value: "#098FCE" },
  { name: "green", value: "#3DA329" },
  { name: "orange", value: "#F59E27" },
  { name: "purple", value: "#7408B4" },
  { name: "red", value: "#DF1112" },
];

exports.icons = ["key"];
