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
import { Preferences, SDFile } from "./utils/types";
import { getTranslations } from "./utils/translations";
import { useMQTT } from "./utils/mqtt";
import { formatBytes } from "./utils/format";
import { isPrintableFile, isProjectFile } from "./utils/fileUtils";
import { FTP_CONFIG, SD_CARD_PATHS } from "./utils/constants";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const t = getTranslations();

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
      await ftpClient.access({
        host: preferences.ipAddress,
        user: FTP_CONFIG.USERNAME,
        password: preferences.accessCode,
        secure: "implicit",
        port: FTP_CONFIG.SECURE_PORT,
        secureOptions: { rejectUnauthorized: false },
      });
    } catch {
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
    setProgress(t.progress_analyzing_sd);

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
              const folderName = folder.replace("/", "");
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
          title: t.toast_sd_loaded,
          message: `${printableFiles.length} ${t.toast_files_count}`,
        });
      } else {
        showToast({ style: Toast.Style.Failure, title: t.toast_no_files, message: t.toast_no_printable_files });
      }
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: t.toast_ftp_error, message: String(e) });
    } finally {
      ftp.close();
      setIsLoading(false);
      setProgress("");
    }
  };

  const uploadToPrinter = async (filePath: string) => {
    if (!fs.existsSync(filePath)) return;

    const fileName = path.basename(filePath);
    setIsLoading(true);
    setProgress(`${t.progress_upload} ${fileName}...`);

    const ftp = new FTPClient();
    ftp.trackProgress((info) => {
      setProgress(`${t.progress_upload_percent} ${Math.round((info.bytes / info.bytesOverall) * 100)}%`);
    });

    try {
      await connectFtp(ftp);
      await ftp.uploadFrom(filePath, `/${fileName}`);
      showToast({ style: Toast.Style.Success, title: t.toast_upload_complete });
      await refreshSdFiles();
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: t.toast_upload_error, message: String(e) });
    } finally {
      ftp.close();
      setIsLoading(false);
      setProgress("");
    }
  };

  const startPrint = async (fileName: string, useAmsOverride?: boolean) => {
    if (!client || !isConnected) {
      showToast({ style: Toast.Style.Failure, title: t.toast_error, message: t.toast_printer_disconnected });
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
    showToast({ style: Toast.Style.Success, title: t.toast_print_started, message: baseName });
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
              title={t.form_submit_upload}
              icon={Icon.Upload}
              onSubmit={(values) => {
                const files = values.files as string[];

                if (!files || files.length === 0) {
                  setFileError(t.error_no_file);
                  return;
                }

                const file = files[0];

                if (!isPrintableFile(file)) {
                  setFileError(t.error_wrong_ext);
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
          title={t.form_file_label}
          allowMultipleSelection={false}
          info={t.form_file_info}
          error={fileError}
          onChange={() => setFileError(undefined)}
        />
      </Form>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={t.search_placeholder_sd}>
      <List.Item
        title={isConnected ? t.status_connected : t.status_disconnected}
        subtitle={progress || preferences.ipAddress}
        icon={
          isConnected
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.XMarkCircle, tintColor: Color.Red }
        }
      />

      <List.Section title={t.section_upload}>
        {selectedLocalFile ? (
          <List.Item
            title={`${t.upload_selected_prefix} ${path.basename(selectedLocalFile)}`}
            subtitle={getFileSizeSafe(selectedLocalFile)}
            icon={Icon.Finder}
            actions={
              <ActionPanel>
                <Action
                  title={t.action_send_printer}
                  icon={Icon.Upload}
                  onAction={() => uploadToPrinter(selectedLocalFile)}
                />
                <Action.Push title={t.action_choose_other} icon={Icon.Folder} target={<ManualUploadForm />} />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            title={t.upload_manual_title}
            subtitle={t.upload_manual_subtitle}
            icon={Icon.Upload}
            actions={
              <ActionPanel>
                <Action.Push title={t.action_choose_file} icon={Icon.Folder} target={<ManualUploadForm />} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title={t.section_sd}>
        {sdFiles.length === 0 && !isLoading && (
          <List.Item
            title={t.sd_load_title}
            icon={Icon.Download}
            actions={
              <ActionPanel>
                <Action title={t.action_load} onAction={refreshSdFiles} />
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
                  title={t.action_print}
                  icon={Icon.Print}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: t.confirm_print_title,
                        message: `${t.alert_file_label} ${file.name}\nAMS: ${preferences.useAmsDefault ? t.ams_status_on : t.ams_status_off}\n\n${t.confirm_print_msg}`,
                        primaryAction: { title: t.alert_print_btn, style: Alert.ActionStyle.Destructive },
                      })
                    ) {
                      await startPrint(file.name);
                    }
                  }}
                />

                <Action
                  title={t.action_print_without_ams}
                  icon={Icon.Circle}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={async () => {
                    if (await confirmAlert({ title: t.alert_mode_standard, message: t.alert_print_without_ams_msg })) {
                      await startPrint(file.name, false);
                    }
                  }}
                />

                <Action
                  title={t.action_print_with_ams}
                  icon={Icon.Circle}
                  shortcut={{ modifiers: ["cmd"], key: "y" }}
                  onAction={async () => {
                    if (await confirmAlert({ title: t.alert_mode_ams, message: t.alert_print_with_ams_msg })) {
                      await startPrint(file.name, true);
                    }
                  }}
                />

                <Action
                  title={t.action_refresh}
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
