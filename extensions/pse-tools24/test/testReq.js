import xml2js from "xml2js";

const fetchSubInfo = async () => {
  const phpSessIdCookie = "24do31e4ci4moe7j9gfnsi6nrf";
  const fetchURL = "https://qmops2.quantummetric.com/ops/a_getinstlist.html";
  const fetchOptions = {
    headers: {
      cookie: `PHPSESSID=${phpSessIdCookie}`,
    },
  };
  return await fetch(fetchURL, fetchOptions).then((res) => res.text());
};

const getRawJson = async(xmlStr) => {
  const parser = new xml2js.Parser()
  return await parser.parseStringPromise(xmlStr)
}

// const getRecords = (rawJSON) => {
//   const baseRecords = rawJSON.data.record
// }

(async () => {
  const xmlStr = await fetchSubInfo()
  const rawJSON = await getRawJson(xmlStr)
  // const subRecords = getRecords(rawJSON)
  console.log(rawJSON.data.msg[0])
})();
