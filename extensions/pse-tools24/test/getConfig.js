/* eslint-disable @typescript-eslint/no-unused-vars */
import fetch from "node-fetch";

const getConfig = async (sub) => {
  const raw = await fetch(`https://cdn.quantummetric.com/bootstrap/quantum-${sub}.js`).then(r => r.text())
  const start = "Start("
  const end = `"${sub}"});`
  const cstring = raw.slice(raw.indexOf(start)+start.length, raw.indexOf(end)+(end.length-2))
  return eval(`(${cstring})`);
};

const flattenObject = (config) => {
  return Object.fromEntries(
    Object.entries(config).map(([k, v]) => {
      switch (true) {
        case typeof v === "string":
          return [k, v];
        case v.length === 1:
          if (Object.keys(v[0]).includes("value")) {
            return [k, v[0].value];
          }
          if (Object.keys(v[0]).includes("rules")) {
            return [k, v[0].rules.map((r) => r.value.map((v) => (v.p ? v.p : v)))];
          }
          break;
        default:
          return [k, "need to figure"];
      }
    }),
  );
};

(async () => {
  const config = await getConfig("homedepot");

  console.log(config);
})();
