import { useEffect, useState } from "react";
import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";
import { exec, spawn } from "child_process";
import DiskSection from "./DiskSection";

export default function ListDisks(): JSX.Element {
  const [disks, setDisks] = useState<DiskSection[]>([]);
  const [showingDetail, setShowingDetail] = useState(false);

  useEffect(() => {
    process.env.PATH = `${process.env.PATH}:/usr/sbin:/usr/bin/`;
    process.env.USER = `$USER`;
    fetchDisks("Init");
  }, []);

  /**
   * Initial initialization for all disks
   * Using a stream testwise (did not really work unfortunately)
   */
  async function initialInitDiskSections() {
    showToast({
      style: Toast.Style.Animated,
      title: "Initializing...",
    });

    const diskSections: DiskSection[] = [];

    const stream = execDiskCommandStream("diskutil list");
    const outputBuffer = { data: "" };

    updateDiskSections("DiskUpdate");

    //stream.stdout.on("data", (chunk) => handleChunk(chunk, outputBuffer, diskSections));

    //stream.on("close", () => handleRemainingSection(outputBuffer, diskSections))
  }

  /**
   * Tried to performance using chunks, but the script command is not built for that
   * @param chunk
   * @param outputBuffer
   * @param diskSections
   */
  function handleChunk(chunk: string, outputBuffer: { data: string }, diskSections: DiskSection[]) {
    outputBuffer.data += chunk;

    //const sectionRegex = /(\/.*?:.*?)(?=(?:\/))/sg;
    const sectionRegex = /(\/.*?:.*?)(?=(?:\/|$))/gs;

    let match;
    //console.log(outputBuffer.data.split("\n").length)

    while ((match = sectionRegex.exec(outputBuffer.data)) !== null) {
      //console.log(counter++)
      console.log("Match");

      console.log(match.join("\n"));

      const diskSection = DiskSection.createFromString(match[0]);
      diskSection
        .initDisks()
        .then(() => {
          diskSections.push(diskSection);
          setDisks([...diskSections]);
        })
        .catch((error) => {
          showToast({
            style: Toast.Style.Failure,
            title: "ERROR: Failed to initialize disks",
            message: error.message,
          });
        });

      // Remove processed sections from the buffer
      outputBuffer.data = outputBuffer.data.replace(match[0], "");
    }
  }

  function handleRemainingSection(outputBuffer: { data: string }, diskSections: DiskSection[]) {
    const sectionRegex = /(\/.*?:.*?)(?=(?:\/|$))/gs;
    const remainingSections = outputBuffer.data.match(sectionRegex) ?? [];
    console.log("Remaining Sections");
    console.log(remainingSections);
    for (const sectionString of remainingSections) {
      const diskSection = DiskSection.createFromString(sectionString);

      diskSection
        .initDisks()
        .then(() => {
          diskSections.push(diskSection);
          setDisks([...diskSections]);
        })
        .catch((error) => {
          console.log(error);
        });
    }

    showToast({
      style: Toast.Style.Success,
      title: "Initialized",
    });
  }

  // DiskUpdate (Dont show Toast) or Refresh
  async function updateDiskSections(update: string | "DiskUpdate" | "Refresh") {
    // If DiskUpdate, re'initDisks all diskSections without initially fetching them

    const initDisksPromises = disks.map((disk) =>
      disk.initDisks().then(() => {
        setDisks((prevDisks) => [...prevDisks]);
      })
    );
    await Promise.all(initDisksPromises);

    // Now fetch new disks
    const diskOutput = await execDiskCommand("diskutil list");
    const sectionRegex = /(\/.*?:.*?)(?=(?:\/|$))/gs;
    const sectionStrings = diskOutput.match(sectionRegex) ?? [];
    const newDiskSections: DiskSection[] = sectionStrings.map(DiskSection.createFromString);

    console.log(diskOutput.split("\n").length);

    // Check if disks are the same
    // NOTE: This is a simple comparison that checks if the length of disks are the same.
    // You might need to implement a deeper comparison depending on the structure of DiskSection.
    const areDisksTheSame = disks.length === newDiskSections.length;

    if (!areDisksTheSame || update === "Refresh") {
      showToast({
        style: Toast.Style.Animated,
        title: "Refreshing...",
      });

      await Promise.all(newDiskSections.map((disk) => disk.initDisks()));
      setDisks(newDiskSections);

      showToast({
        style: Toast.Style.Success,
        title: "Refreshed",
      });
    }
  }

  /**
   *
   * @param update "DiskUpdate", "Refresh", "Init"
   */
  function fetchDisks(update: string | "Init" | "DiskUpdate" | "Refresh") {
    try {
      if (update === "Init") {
        initialInitDiskSections();
      } else {
        updateDiskSections(update);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "ERROR: Failed to fetch disks",
      });
    }
  }

  /**
   * Helper
   * @param command
   * @returns
   */
  async function execDiskCommand(command: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  function execDiskCommandStream(command: string) {
    const [cmd, ...args] = command.split(" ");
    const childProcess = spawn(cmd, args);
    return childProcess;
  }

  return (
    <List isShowingDetail={showingDetail}>
      {/* Iterating over each DiskSection object in the disks array */}
      {disks.map((diskSection, index) => {
        return (
          <List.Section key={index} title={diskSection.sectionName}>
            {/* Iterating over each disk in each*/}
            {diskSection.disks.map((disk, diskIndex) => {
              return (
                <List.Item
                  key={diskIndex}
                  title={disk.number + ": " + disk.identifier}
                  subtitle={disk.name + disk.getFormattedSize()}
                  accessories={[{ tag: { value: disk.type } }, disk.getMountStatusAccessory()]}
                  detail={showingDetail ? <List.Item.Detail metadata={disk.getDetails()} /> : null}
                  keywords={[disk.name, disk.mountStatus]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard content={disk.identifier} />
                      <Action title="Toggle Detail" onAction={() => setShowingDetail(!showingDetail)} />
                      {disk.getActions(fetchDisks).map((action, index) => (
                        <Action
                          key={index}
                          title={action.title}
                          shortcut={action.shortcut}
                          onAction={() => {
                            action.onAction();
                          }}
                        />
                      ))}
                      <Action
                        title="Refresh List"
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={() => fetchDisks("Refresh")}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
