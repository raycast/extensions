import { showToast, Toast, MenuBarExtra } from "@raycast/api";
import fetch from "node-fetch";
import { useState, useEffect } from "react";

const NETWORKS = {
  mainnet: "https://api.mainnet-beta.solana.com",
  testnet: "https://api.testnet.solana.com",
  devnet: "https://api.devnet.solana.com",
};

const STATUS_TEXT = {
  progressing: "Progressing",
  halted: "Halted",
  unknown: "Unknown",
};

export default function Command() {
  const [epoch, setEpoch] = useState(null);
  const [epochProgress, setEpochProgress] = useState(null); // Progress percentage
  const [remainingTime, setRemainingTime] = useState(null);
  const [currentSlot, setCurrentSlot] = useState(null);
  const [previousSlot, setPreviousSlot] = useState(null);
  const [status, setStatus] = useState(STATUS_TEXT.unknown);
  const [selectedNetwork, setSelectedNetwork] = useState("mainnet"); // Default to Mainnet

  useEffect(() => {
    fetchEpochData(selectedNetwork); // Fetch data once on load
  }, [selectedNetwork]);

  async function fetchEpochData(network) {
    const maxRetries = 3; // Maximum number of retries
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: `Fetching Data for ${capitalize(network)}... (Attempt ${attempts + 1})`,
        });

        const response = await fetch(NETWORKS[network], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getEpochInfo",
          }),
        });

        const data = await response.json();
        if (!data.result) throw new Error("Invalid response from API");

        const { epoch, slotIndex, slotsInEpoch, absoluteSlot } = data.result;
        const remainingSlots = slotsInEpoch - slotIndex;
        const timePerSlot = 0.4; // Solana's average slot time in seconds
        const remainingSeconds = Math.floor(remainingSlots * timePerSlot);

        // Update epoch and progress %
        setEpoch(epoch);
        const progressPercentage = ((slotIndex / slotsInEpoch) * 100).toFixed(2);
        setEpochProgress(progressPercentage);

        // Update remaining time
        setRemainingTime(formatTime(remainingSeconds));

        console.log(`Absolute Slot: ${absoluteSlot}, Current Slot: ${currentSlot}`);

        // Compare new slot with the previous slot
        if (currentSlot !== null) {
          if (absoluteSlot > currentSlot) {
            console.log("Status: Progressing");
            setStatus(STATUS_TEXT.progressing); // Progressing
          } else if (absoluteSlot <= currentSlot) {
            console.log("Status: Halted");
            setStatus(STATUS_TEXT.halted); // Halted
          }
        } else {
          console.log("Initial fetch; skipping comparison.");
          setStatus(STATUS_TEXT.progressing); // Assume progressing on first fetch
        }

        // Update slots
        setPreviousSlot(currentSlot);
        setCurrentSlot(absoluteSlot);

        toast.hide();
        return; // Exit the loop on success
      } catch (error) {
        attempts++;
        console.error(`Attempt ${attempts} failed:`, error.message);

        if (attempts >= maxRetries) {
          console.error("All fetch attempts failed.");
          setStatus(STATUS_TEXT.unknown); // Set status to unknown after max retries
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch data",
            message: `Tried ${maxRetries} times. Please try again later.`,
          });
        }
      }
    }
  }

  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  }

  function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  return (
    <MenuBarExtra
      icon="extension-icon.png"
      title={`${capitalize(selectedNetwork)} Epoch: ${epoch ?? "Loading..."} (${epochProgress ?? "0"}%)`}
      tooltip={`Network: ${capitalize(selectedNetwork)}\nRemaining: ${remainingTime ?? "Loading..."}\nCurrent Slot: ${currentSlot ?? "Loading..."}\nNetwork Status: ${status}`}
    >
      {Object.keys(NETWORKS).map((network) => (
        <MenuBarExtra.Item
          key={network}
          title={capitalize(network)}
          onAction={async () => {
            if (selectedNetwork !== network) { // Only switch if a new network is selected
              setSelectedNetwork(network);
              await fetchEpochData(network); // Fetch data for the newly selected network
            }
          }}
        />
      ))}
    </MenuBarExtra>
  );
}