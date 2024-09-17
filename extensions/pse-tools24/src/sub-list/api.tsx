import { getPreferenceValues } from "@raycast/api";
import xml2js from "xml2js";
import fetch from "node-fetch";

const sessCookie = getPreferenceValues().sessCookie

// fetch XML from QMOPS
const fetchSubInfo = async () => {
  const fetchURL = "https://qmops2.quantummetric.com/ops/a_getinstlist.html";
  const fetchOptions = {
    headers: {
      cookie: `PHPSESSID=${sessCookie}`,
    },
  };
  return await fetch(fetchURL, fetchOptions).then(async (res) => {
    const result = await res.text()
    if(/<data>/.test(result)){
      return result
    }
  });

};

// parse XML to JSON
type RawJSON = {
  data: {
    msg: string[];
    record: {
      container: string[];
      instance: string[];
      imgTag: string[];
      string: string[];
    }[];
  };
};
const getRawJson = async (xmlStr: string): Promise<RawJSON> => {
  const parser = new xml2js.Parser();
  return await parser.parseStringPromise(xmlStr);
};


//Formats the rawJSON built by xml2js into an array of SubRecords 
export type SubRecord = {
  [index: string]: string | boolean
  "server": string,
  "instance": string,
  "yml": string,
  "container": string,
  "procCount": string,
  "imgTag": string,
  "rProxy": boolean,
  "smartSampling": boolean,
  "wren": boolean,
  "bigTable": boolean,
  "vHost": string,
  "horizon": boolean,
  "instrumentation": string
}
const getRecords = (rawJSON: RawJSON): SubRecord[] => {
  const baseRecords = rawJSON.data.record.filter((record) =>
    /nodejs/.test(record.container[0])
  );
  const records = baseRecords.map((record) => {
    const finalObj = Object.fromEntries(
      Object.entries(record).map(([key, value]) => {
        if (value[0] == "false" || value[0] == "null" || !value[0]) {
          return [key, false];
        } else if (value[0] == "true") {
          return [key, true];
        }
        return [key, value[0]];
      })
    );
    const recordContainers = rawJSON.data.record.filter(r => r.instance[0] == finalObj.instance)
    finalObj.horizon = !!recordContainers.find(c => /neutron/.test(c.imgTag[0]))
    return finalObj});
  return records.sort((a, b) => (a.instance > b.instance ? 1 : -1));
};

//Consolidated function for fetching sub records from QMOPS and formatting into JS object
export const getSubRecords = async () => {
  const xmlStr = await fetchSubInfo();
  if(!xmlStr){
    return
  }
  const rawJSON = await getRawJson(xmlStr);
  const subRecords = getRecords(rawJSON);
  return subRecords;
};

// getSubInstrumentation
export const getInstrumentation = async (instance: string) => {
  return await fetch(
    `https://cdn.quantummetric.com/qscripts/quantum-${instance}.js`
  )
    .then((r) => r.text())
    .then((text) => {
      try {
        const top = text.match(/eula \S+ (\w{8})/)![1];
        const version = text.match(/"(\d+\.\d+\.\d+)"/)![1]
        return version+" "+top
      } catch (e) {
        console.error(e);
        return "error"
      }
    });
};

// getSubConfig
// type EventDefinitions = {events: {[index: string]: boolean|string|number|object}[]}
type SubConfig = {[index: string]: string|object|object[]}
export const getConfig = async (sub: SubRecord): Promise<SubConfig | string> => {
  try {
  const subscription = sub.instance
  const rawConfig = await fetch(`https://cdn.quantummetric.com/bootstrap/quantum-${subscription}.js`).then((r) => r.text());
  const start = "Start("
  const end = `"${subscription}"});`
  const cstring = rawConfig.slice(rawConfig.indexOf(start)+start.length, rawConfig.indexOf(end)+(end.length-2))
    return eval(`(${cstring})`)
  } catch (error) {
    return "Could not fetch config"
  }
};