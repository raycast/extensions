import { runAppleScript } from "@raycast/utils";
import { showToast, Toast, LocalStorage } from "@raycast/api";
import { Device, CachedDevices } from "../types";

const CACHE_DURATION = 5 * 60 * 1000;
const CACHE_KEY = "cached_devices";

const getRandomName = (): string => {
  const adjectives = [
    "Sleepy",
    "Happy",
    "Grumpy",
    "Sneezy",
    "Bashful",
    "Dancing",
    "Singing",
    "Magical",
    "Mysterious",
    "Clever",
    "Witty",
    "Quirky",
    "Jolly",
    "Fancy",
    "Bouncing",
    "Glowing",
    "Sparkly",
    "Cosmic",
    "Funky",
    "Jazzy",
    "Wobbly",
    "Floating",
    "Prancing",
    "Giggling",
    "Whimsical",
    "Dazzling",
    "Nifty",
  ];

  const nouns = [
    "Penguin",
    "Robot",
    "Unicorn",
    "Dragon",
    "Wizard",
    "Ninja",
    "Pirate",
    "Raccoon",
    "Panda",
    "Koala",
    "Fox",
    "Hamster",
    "Dolphin",
    "Octopus",
    "Dinosaur",
    "Llama",
    "Yeti",
    "Phoenix",
    "Goblin",
    "Mermaid",
    "Astronaut",
    "Mongoose",
    "Platypus",
    "Narwhal",
    "Capybara",
    "Axolotl",
    "Sloth",
  ];

  const techNouns = [
    "Router",
    "Switch",
    "Gateway",
    "Bridge",
    "Server",
    "Hub",
    "Console",
    "Terminal",
    "Beacon",
    "Portal",
    "Monitor",
    "Sensor",
    "Transmitter",
  ];

  const allNouns = [...nouns, ...techNouns];
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = allNouns[Math.floor(Math.random() * allNouns.length)];
  return `${randomAdjective} ${randomNoun}`;
};

const getPerformanceColor = (performance: number): string => {
  const normalizedPerformance = Math.min(255, Math.max(0, performance));
  const red = Math.min(255, Math.max(0, 255 - normalizedPerformance));
  const green = Math.min(255, Math.max(0, normalizedPerformance));
  return `rgb(${red}, ${green}, 0)`;
};

const detectBridgeInterface = async (): Promise<string[] | null> => {
  const script = `
    with timeout of 5 seconds
      do shell script "ifconfig | awk '/^[a-z0-9]+:/{iface=$1} /member: ap1/{print iface}' | cut -d: -f1"
    end timeout
  `;
  const stdout = await runAppleScript<string>(script);
  const lines = stdout.split("\r");
  return lines.length > 0 ? lines : null;
};

const fetchConnectedDevices = async (): Promise<Device[]> => {
  try {
    const cachedData = await LocalStorage.getItem<string>(CACHE_KEY);
    if (cachedData) {
      const cached: CachedDevices = JSON.parse(cachedData);
      const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;

      if (!isExpired) {
        return cached.devices;
      }
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Scanning network",
      message: "This might take a few seconds...",
    });

    const bridgeInterface = await detectBridgeInterface();
    if (!bridgeInterface) {
      throw new Error("No active network interface found");
    }

    let allDevices: Device[] = [];
    for (const iface of bridgeInterface) {
      try {
        const script = `
          with timeout of 5 seconds
            do shell script "arp -a -i ${iface} 2>/dev/null || ip neigh 2>/dev/null || echo 'No ARP data available'"
          end timeout
        `;

        const stdout = await runAppleScript<string>(script);
        if (stdout.includes("No ARP data available")) {
          console.warn(`No ARP data available on interface: ${iface}`);
          continue;
        }

        const lines = stdout.split("\r");
        const devices = extractBridgeAddresses(lines);
        allDevices = allDevices.concat(devices);
      } catch (error) {
        console.error(`Error scanning interface ${iface}: ${error}`);
        continue;
      }
    }

    const cacheData: CachedDevices = {
      timestamp: Date.now(),
      devices: allDevices,
    };
    await LocalStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

    await showToast({
      style: Toast.Style.Success,
      title: "Scan complete",
      message: `Found ${allDevices.length} devices`,
    });

    return allDevices;
  } catch (error) {
    console.error(`Error fetching connected devices: ${error}`);
    const cachedData = await LocalStorage.getItem<string>(CACHE_KEY);
    if (cachedData) {
      const cached: CachedDevices = JSON.parse(cachedData);
      await showToast({
        style: Toast.Style.Failure,
        title: "Scan failed",
        message: "Showing cached devices",
      });
      return cached.devices;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to scan network",
    });
    throw error;
  }
};
const refreshDevices = async (): Promise<Device[]> => {
  await LocalStorage.removeItem(CACHE_KEY);
  return fetchConnectedDevices();
};

const startBackgroundRefresh = () => {
  const intervalId = setInterval(async () => {
    try {
      await fetchConnectedDevices();
    } catch (error) {
      console.error("Background refresh failed:", error);
    }
  }, CACHE_DURATION);

  return () => clearInterval(intervalId);
};

const estimateNetworkPerformance = async (ip: string): Promise<number> => {
  const script = `
    with timeout of 5 seconds
      do shell script "ping -c 5 -i 0.2 -q ${ip}"
    end timeout
  `;
  const stdout = await runAppleScript<string>(script);
  const lines = stdout.split("\r");
  let packetLoss = 0;
  let averageLatency = 0;

  lines.forEach((line) => {
    const packetLossMatch = line.match(/([0-9]+)% packet loss/i);
    if (packetLossMatch) {
      packetLoss = parseFloat(packetLossMatch[1]);
    }
    const latencyMatch = line.match(/= ([0-9.]+)\/([0-9.]+)\/([0-9.]+)\/([0-9.]+) ms/i);
    if (latencyMatch) {
      averageLatency = parseFloat(latencyMatch[2]);
    }
  });

  const estimatedMbps = Math.max(0, 100 - packetLoss - averageLatency / 10);
  return Math.round(estimatedMbps);
};

const banDevice = async (mac: string): Promise<boolean> => {
  console.log("Banning device with MAC address:", mac);
  return true;
};

const extractBridgeAddresses = (lines: string[]) => {
  const regex = /\?\s+\(((?:[0-9]{1,3}\.){3}[0-9]{1,3})\)\s+at\s+([0-9a-f:]+)/i;
  const ipAddressesAndMacs = lines
    .map((line) => {
      const match = line.match(regex);

      if (match) {
        return {
          ip: match[1],
          mac: match[2],
        };
      }
      return null;
    })
    .filter((result): result is { ip: string; mac: string } => result !== null && result.mac !== "ff:ff:ff:ff:ff:ff");

  return ipAddressesAndMacs;
};

export {
  fetchConnectedDevices,
  banDevice,
  refreshDevices,
  startBackgroundRefresh,
  getRandomName,
  estimateNetworkPerformance,
  getPerformanceColor,
};
