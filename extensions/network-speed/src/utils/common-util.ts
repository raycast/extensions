import { NetworkSpeed } from "../types/type";

export function getNetSpeed(testSequentially: boolean, execResult: string) {
  let network: NetworkSpeed;
  const finalData = execResult + "E";
  if (execResult.includes("Uplink capacity")) {
    const uploadCapacity = finalData.match(/Uplink capacity: ([\s\S]*?)\nDownlink capacity/);
    const idleLatency = finalData.match(/Idle Latency: ([\s\S]*?)E/);
    let downloadCapacity: RegExpMatchArray | null;
    let responsiveness: RegExpMatchArray | null;
    let uploadResponsiveness: RegExpMatchArray | null;
    let downloadResponsiveness: RegExpMatchArray | null;
    if (testSequentially) {
      downloadCapacity = finalData.match(/Downlink capacity: ([\s\S]*?)\nUplink Responsiveness/);
      uploadResponsiveness = finalData.match(/Uplink Responsiveness: ([\s\S]*?)\nDownlink/);
      downloadResponsiveness = finalData.match(/Downlink Responsiveness: ([\s\S]*?)\nIdle Latency/);
      responsiveness = null;
    } else {
      downloadCapacity = finalData.match(/Downlink capacity: ([\s\S]*?)\nResponsiveness/);
      responsiveness = finalData.match(/Responsiveness: ([\s\S]*?)\nIdle Latency/);
      uploadResponsiveness = null;
      downloadResponsiveness = null;
    }
    network = {
      uploadCapacity: uploadCapacity !== null ? uploadCapacity[1].trim() : "0 Mbps",
      downloadCapacity: downloadCapacity !== null ? downloadCapacity[1].trim() : "0 Mbps",
      uploadResponsiveness: uploadResponsiveness !== null ? uploadResponsiveness[1].trim() : "0 RPM",
      downloadResponsiveness: downloadResponsiveness !== null ? downloadResponsiveness[1].trim() : "0 RPM",
      responsiveness: responsiveness !== null ? responsiveness[1].trim() : "0 RPM",
      idleLatency: idleLatency !== null ? idleLatency[1].trim() : "0 milli-seconds",
      hasIdleLatency: true,
    };
  } else {
    const uploadCapacity = finalData.match(/Upload capacity: ([\s\S]*?)\nDownload capacity/);
    const downloadCapacity = finalData.match(/Download capacity: ([\s\S]*?)\nUpload flows/);
    const responsiveness = finalData.match(/Responsiveness: ([\s\S]*?)E/);
    const uploadResponsiveness = finalData.match(/Upload Responsiveness: ([\s\S]*?)\nDownload/);
    const downloadResponsiveness = finalData.match(/Download Responsiveness: ([\s\S]*?)E/);
    network = {
      uploadCapacity: uploadCapacity !== null ? uploadCapacity[1].trim() : "0 Mbps",
      downloadCapacity: downloadCapacity !== null ? downloadCapacity[1].trim() : "0 Mbps",
      uploadResponsiveness: uploadResponsiveness !== null ? uploadResponsiveness[1].trim() : "0 RPM",
      downloadResponsiveness: downloadResponsiveness !== null ? downloadResponsiveness[1].trim() : "0 RPM",
      responsiveness: responsiveness !== null ? responsiveness[1].trim() : "0 RPM",
      hasIdleLatency: false,
    };
  }

  return network;
}

export function extractSpeedLoadingInfo(str: string): string {
  const tempStr = str.replaceAll("responsiveness ", "").replaceAll("capacity ", "");
  const regex = /Downlink: ([\d.]+ Mbps).*Uplink: ([\d.]+ Mbps)/;
  const match = tempStr.match(regex);
  if (match) {
    const downlink = match[1] || "";
    const uplink = match[2] || "";

    if (downlink && uplink) {
      return `Downlink: ${downlink}, Uplink: ${uplink}`;
    }
  }

  return "Takes about 20 seconds";
}
