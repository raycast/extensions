import {
  ActionPanel,
  Action,
  Icon,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  getSelectedFinderItems,
  confirmAlert,
  Alert,
  Color,
  Form,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import * as fs from "fs";
import * as path from "path";
import { Client as FTPClient, FileInfo } from "basic-ftp";
import { SDFile, BambuPreferences } from "./utils/types";
import { useMQTT } from "./utils/mqtt";
import { formatBytes } from "./utils/format";
import { isPrintableFile, isProjectFile } from "./utils/fileUtils";
import { FTP_CONFIG, SD_CARD_PATHS } from "./utils/constants";

export default function Command() {
  const preferences = getPreferenceValues<BambuPreferences>();

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [selectedLocalFile, setSelectedLocalFile] = useState<string | null>(null);
  const [sdFiles, setSdFiles] = useState<SDFile[]>([]);

  const { client, isConnected } = useMQTT(preferences, {
    subscribeToReports: false,
    pushAllOnConnect: false,
  });

  useEffect(() => {
    const checkFinder = async () => {
      try {
        const items = await getSelectedFinderItems();
        const validFile = items.find((item) => isPrintableFile(item.path));
        if (validFile) setSelectedLocalFile(validFile.path);
      } catch {
        // Ignore error if no selection or Finder access issue
      }
    };
    checkFinder();
  }, []);

  const connectFtp = async (ftpClient: FTPClient) => {
    try {
      // Try FTPS first (Implicit TLS)
      await ftpClient.access({
        host: preferences.ipAddress,
        user: FTP_CONFIG.USERNAME,
        password: preferences.accessCode,
        secure: "implicit",
        port: FTP_CONFIG.SECURE_PORT,
        secureOptions: {
          // Necessary for Bambu Lab printers which use self-signed certificates on local LAN.
          // Without this, the connection is rejected by the client.
          rejectUnauthorized: false,
        },
      });
    } catch {
      // Fallback to plain FTP if FTPS fails
      await ftpClient.access({
        host: preferences.ipAddress,
        user: FTP_CONFIG.USERNAME,
        password: preferences.accessCode,
        secure: false,
        port: FTP_CONFIG.INSECURE_PORT,
      });
    }
  };

  const refreshSdFiles = async () => {
    setIsLoading(true);
    setProgress("Analyzing SD card...");

    const ftp = new FTPClient();
    ftp.ftp.verbose = false;

    try {
      await connectFtp(ftp);

      const folders = [SD_CARD_PATHS.ROOT, SD_CARD_PATHS.CACHE, SD_CARD_PATHS.MODEL];
      let allFiles: FileInfo[] = [];

      for (const folder of folders) {
        try {
          const list = await ftp.list(folder);
          const filesInFolder = list.map((f) => {
            if (folder !== SD_CARD_PATHS.ROOT) {
              const folderName = folder.replace(/^\//, "");
              f.name = `${folderName}/${f.name}`;
            }
            return f;
          });
          allFiles = [...allFiles, ...filesInFolder];
        } catch {
          // Silently ignore folders that cannot be accessed
        }
      }

      const printableFiles = allFiles
        .filter((f) => {
          if (!f.isFile) return false;

          const cleanName = path.basename(f.name);
          if (cleanName.startsWith("._")) return false;

          return isPrintableFile(f.name);
        })
        .map((f) => ({
          name: f.name,
          size: f.size,
          date: new Date(f.rawModifiedAt || f.modifiedAt || Date.now()),
        }))
        .sort((a, b) => {
          const isAProject = isProjectFile(a.name);
          const isBProject = isProjectFile(b.name);

          if (isAProject && !isBProject) return -1;
          if (!isAProject && isBProject) return 1;

          return b.date.getTime() - a.date.getTime();
        });

      setSdFiles(printableFiles);

      if (printableFiles.length > 0) {
        showToast({
          style: Toast.Style.Success,
          title: "SD loaded",
          message: `${printableFiles.length} files`,
        });
      } else {
        showToast({ style: Toast.Style.Failure, title: "No files", message: "No printable files found" });
      }
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "FTP Error", message: String(e) });
    } finally {
      ftp.close();
      setIsLoading(false);
      setProgress("");
    }
  };

  const uploadToPrinter = async (filePath: string) => {
    if (!fs.existsSync(filePath)) return;

    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;

    setIsLoading(true);
    setProgress(`Upload: ${fileName}...`);

    const ftp = new FTPClient();
    ftp.trackProgress((info) => {
      if (fileSize > 0) {
        const percent = Math.round((info.bytesOverall / fileSize) * 100);
        setProgress(`Uploading ${percent}%`);
      }
    });

    try {
      await connectFtp(ftp);
      await ftp.uploadFrom(filePath, `/${fileName}`);
      showToast({ style: Toast.Style.Success, title: "Upload complete!" });
      await refreshSdFiles();
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Upload Error", message: String(e) });
    } finally {
      ftp.close();
      setIsLoading(false);
      setProgress("");
    }
  };

  const startPrint = async (fileName: string, useAmsOverride?: boolean) => {
    if (!client || !isConnected) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: "Printer disconnected" });
      return;
    }
    const shouldUseAms = useAmsOverride !== undefined ? useAmsOverride : preferences.useAmsDefault;
    const isProject = isProjectFile(fileName);
    const baseName = path.basename(fileName);

    const payload = {
      print: {
        sequence_id: Date.now().toString(),
        command: isProject ? "project_file" : "gcode_file",

        url: `file:///sdcard/${fileName}`,

        param: isProject ? "Metadata/plate_1.gcode" : baseName,

        bed_levelling: true,
        flow_cali: true,
        vibration_cali: true,
        layer_inspect: true,
        use_ams: shouldUseAms,
      },
    };

    client.publish(`device/${preferences.serialNumber}/request`, JSON.stringify(payload));
    showToast({ style: Toast.Style.Success, title: "Print started 🚀", message: baseName });
  };

  const getFileSizeSafe = (path: string) => {
    try {
      return formatBytes(fs.statSync(path).size);
    } catch {
      return "";
    }
  };

  function ManualUploadForm() {
    const { pop } = useNavigation();
    const [fileError, setFileError] = useState<string | undefined>();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Send to Printer"
              icon={Icon.Upload}
              onSubmit={(values) => {
                const files = values.files as string[];

                if (!files || files.length === 0) {
                  setFileError("Please select a file.");
                  return;
                }

                const file = files[0];

                if (!isPrintableFile(file)) {
                  setFileError("Only .3mf and .gcode files are accepted!");
                  return;
                }

                setFileError(undefined);
                uploadToPrinter(file);
                pop();
              }}
            />
          </ActionPanel>
        }
      >
        <Form.FilePicker
          id="files"
          title="File"
          allowMultipleSelection={false}
          info=".3mf or .gcode"
          error={fileError}
          onChange={() => setFileError(undefined)}
        />
      </Form>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search file on SD...">
      <List.Item
        title={isConnected ? "Connected" : "Disconnected"}
        subtitle={progress || preferences.ipAddress}
        icon={
          isConnected
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.XMarkCircle, tintColor: Color.Red }
        }
      />

      <List.Section title="Upload">
        {selectedLocalFile ? (
          <List.Item
            title={`Upload: ${path.basename(selectedLocalFile)}`}
            subtitle={getFileSizeSafe(selectedLocalFile)}
            icon={Icon.Finder}
            actions={
              <ActionPanel>
                <Action
                  title="Send to Printer"
                  icon={Icon.Upload}
                  onAction={() => uploadToPrinter(selectedLocalFile)}
                />
                <Action.Push title="Choose Another File…" icon={Icon.Folder} target={<ManualUploadForm />} />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            title="Manual Upload"
            subtitle="Upload a file directly to the printer"
            icon={Icon.Upload}
            actions={
              <ActionPanel>
                <Action.Push title="Choose File" icon={Icon.Folder} target={<ManualUploadForm />} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="SD Card">
        {sdFiles.length === 0 && !isLoading && (
          <List.Item
            title="Load files"
            icon={Icon.Download}
            actions={
              <ActionPanel>
                <Action title="Load" onAction={refreshSdFiles} />
              </ActionPanel>
            }
          />
        )}

        {sdFiles.map((file, index) => (
          <List.Item
            key={index}
            title={file.name}
            icon={isProjectFile(file.name) ? { source: Icon.Box, tintColor: Color.Blue } : Icon.Document}
            accessories={[{ text: formatBytes(file.size) }, { date: file.date }]}
            actions={
              <ActionPanel>
                <Action
                  title="Print"
                  icon={Icon.Print}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Start Print?",
                        message: `File: ${file.name}\nAMS: ${preferences.useAmsDefault ? "ON" : "OFF"}\n\nAre you sure you want to start printing this file?`,
                        primaryAction: { title: "Print", style: Alert.ActionStyle.Destructive },
                      })
                    ) {
                      await startPrint(file.name);
                    }
                  }}
                />

                <Action
                  title="Print WITHOUT AMS"
                  icon={Icon.Circle}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={async () => {
                    if (await confirmAlert({ title: "Standard Mode", message: "Print without using AMS?" })) {
                      await startPrint(file.name, false);
                    }
                  }}
                />

                <Action
                  title="Print with AMS"
                  icon={Icon.Circle}
                  shortcut={{ modifiers: ["cmd"], key: "y" }}
                  onAction={async () => {
                    if (await confirmAlert({ title: "AMS Mode", message: "Force AMS usage?" })) {
                      await startPrint(file.name, true);
                    }
                  }}
                />

                <Action
                  title="Refresh"
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={refreshSdFiles}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
