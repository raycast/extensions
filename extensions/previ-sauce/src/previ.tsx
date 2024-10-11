import { useState } from "react";
import { ActionPanel, Action, Icon, Grid, Color, Form, Toast, showToast, Clipboard, open } from "@raycast/api";
import axios, { AxiosError } from "axios";
import * as jmespath from 'jmespath'; // Import jmespath

const CURRENT_VERSION = "1.0.0";
const VERSION_URL = "https://raw.githubusercontent.com/SideMatter/previ-sauce/main/version.json";
const REPO_URL = "https://github.com/SideMatter/previ-sauce/releases";

// Hardcoded API Key
const API_KEY = "FvthEXCHSf1HcEsAuY3NES56e4ajGiuR3PuSmoyP3e12057b";

// Function to filter the API response using jmespath (instead of jq)
function filterWithJmespath(data: any, query: string) {
  try {
    const result = jmespath.search(data, query);
    console.log("Filtered Data: ", result); // Log the filtered result
    return result;
  } catch (error) {
    console.error("jmespath filtering failed", error);
    throw error;
  }
}

// Updated fetchImeiData function to use jmespath filtering
async function fetchImeiData(deviceId: string, serviceId: number) {
  try {
    console.log("Sending Request: ", { deviceId, serviceId, apiKey: API_KEY });

    const response = await axios.post(
      "https://api.imeicheck.net/v1/checks",
      { deviceId, serviceId },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Response Data: ", response.data);

    // Add the jmespath query based on the serviceId
    let jmespathQuery = '*';
    switch (serviceId) {
      case 17:
        jmespathQuery = 'properties.carrier'; // Example filter for Apple Lock
        break;
      case 16:
        jmespathQuery = 'properties.blacklistHistory[0].reasoncodedesc'; // Example filter for Blacklist
        break;
      case 21:
        jmespathQuery = 'properties.eid'; // Example filter for IMEI > EID
        break;
      case 22:
        jmespathQuery = 'properties.deviceName'; // Example filter for IMEI Info
        break;
      default:
        jmespathQuery = '*'; // Return the full response if no specific filter
    }

    const filteredData = filterWithJmespath(response.data, jmespathQuery); // Filter with jmespath

    const resultString = typeof filteredData === 'object' ? JSON.stringify(filteredData) : filteredData;
    return resultString; // Return the filtered result as a string
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error("Error Response: ", axiosError.response?.data || axiosError.message);
      throw new Error("Failed to fetch IMEI data: " + axiosError.message);
    } else {
      throw new Error("An unknown error occurred");
    }
  }
}

export default function Command() {
  const [columns] = useState(3);
  const [isLoading, setIsLoading] = useState(false);

  const options = [
    { name: "Apple Lock", icon: Icon.Lock, serviceId: 17 },
    { name: "BlackList", icon: Icon.BulletPoints, serviceId: 16 },
    { name: "IMEI > EID", icon: Icon.Move, serviceId: 21 },
    { name: "IMEI Info", icon: Icon.Info, serviceId: 22 },
    { name: "Check for Updates", icon: Icon.Upload, serviceId: -1 },
  ];

  function checkAndUpdate(): void {
    throw new Error("Function not implemented.");
  }

  return (
    <Grid columns={columns} inset={Grid.Inset.Large} isLoading={isLoading}>
      {options.map(({ name, icon, serviceId }) => (
        <Grid.Item
          key={name}
          content={{ source: icon, tintColor: Color.PrimaryText }}
          title={name}
          actions={
            <ActionPanel>
              {serviceId === -1 ? (
                <Action title="Check for Updates" onAction={checkAndUpdate} />
              ) : (
                <Action.Push title="Input IMEI" target={<ImeiForm option={{ name, serviceId }} setIsLoading={setIsLoading} />} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

function ImeiForm({ option, setIsLoading }: { option: { name: string, serviceId: number }, setIsLoading: (loading: boolean) => void }) {
  const [imei, setImei] = useState<string>("");

  const handleSubmit = async () => {
    setIsLoading(true);
    if (!imei) {
      const toast = await showToast({ style: Toast.Style.Failure, title: "IMEI is required" });
      setIsLoading(false);
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching data..." });
    try {
      const result = await fetchImeiData(imei, option.serviceId); // Send imei as deviceId
      toast.title = "Success";
      toast.message = result;
      toast.style = Toast.Style.Success;

      if (option.serviceId === 21) {
        await Clipboard.copy(result);
        await showToast({ style: Toast.Style.Success, title: "EID copied to clipboard!" });
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.title = "Error";
      toast.message = err.message;
      toast.style = Toast.Style.Failure;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Submit IMEI" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="imei"
        title="IMEI"
        placeholder="Enter IMEI"
        value={imei}
        onChange={setImei}
      />
    </Form>
  );
}