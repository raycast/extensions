import { LocalStorage } from "@raycast/api";
import moment from "moment";
import net from "net";
import { exec } from "child_process";
import { Resource } from "./types";

export const fetchResources = async () => {
  try {
    // Retrieve the resources from LocalStorage
    const storedResources = await LocalStorage.getItem("resources");

    // Parse the stored string back into an array
    const resources = storedResources ? JSON.parse(String(storedResources)) : [];

    return resources;
  } catch (error) {
    console.error("Failed to fetch resources:", error);
    throw new Error("Failed to fetch resources.");
  }
};

export const updateResourceList = async (resource: Resource, index: number) => {
  const resources = (await fetchResources()) || [];
  const existingIndex = resources.findIndex((r: Resource) => r.url === resource.url && r.port === resource.port);

  if (existingIndex !== -1 && existingIndex !== index) {
    throw new Error("Resource with this URL and port already exists.");
  }

  if (typeof index === "number") {
    resources[index] = resource;
  } else {
    resources.push(resource);
  }

  await LocalStorage.setItem("resources", JSON.stringify(resources));
};

export const deleteResource = async (resource: Resource) => {
  const resources = (await fetchResources()) || [];
  const newResources = resources.filter((r: Resource) => r.url !== resource.url || r.port !== resource.port);
  await LocalStorage.setItem("resources", JSON.stringify(newResources));
};

export const isHostAvailable = async (resource: Resource) => {
  return new Promise((resolve) => {
    const { url, port } = resource;

    const client = new net.Socket();
    const lastChecked = new Date().toISOString();

    client.setTimeout(5000); // Set timeout to 5 seconds

    client.connect(parseInt(port), url, () => {
      client.end();
      resolve({ status: true, lastChecked });
    });

    client.on("error", () => {
      client.destroy();
      resolve({ status: false, lastChecked });
    });

    client.on("timeout", () => {
      client.destroy();
      resolve({ status: false, lastChecked });
    });
  });
};

/**
 * Plays a sound file.
 * @param {string} filePath - The path to the sound file.
 * @param {number} volume - Volume level (0.0 to 1.0).
 */
export const playSound = (filePath: string, volume: number = 1.0) => {
  const command = `afplay "${filePath}" --volume ${volume}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error playing sound: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
  });
};

// Example usage
// playSound('/path/to/your/soundfile.wav', 0.5);

export const generateChartUrl = (statusHistory: Resource["statusHistory"]) => {
  const labels = statusHistory.map((entry) => moment(entry.timestamp).format("h:mm A"));
  const data = statusHistory.map((entry) => (entry.status ? 1 : 1)); // Assigning 1 for 'up' status and 1 for 'down'

  // Assigning green color for 'up' status and red for 'down'
  const backgroundColors = statusHistory.map((entry) =>
    entry.status ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.5)",
  );

  const chartConfig = {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Resource Status",
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: 1,
        },
      ],
    },

    options: {
      indexAxis: "x",
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            display: true,
          },
          ticks: {
            color: "white",
            display: false,
          },
        },
        x: {
          beginAtZero: true,
          grid: {
            display: true,
          },
          ticks: {
            color: "black",
            display: true,
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: "black",
            font: {
              weight: "bold",
              size: 16,
            },
          },
        },
      },
    },
  };

  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=500&height=350&v=4&bkg=rgba(200,200,200,0.9)`;
  return chartUrl;
};
