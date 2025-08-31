import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {
  Action,
  ActionPanel,
  Detail,
  getSelectedFinderItems,
  showToast,
  Toast,
} from '@raycast/api';
import { useCallback, useEffect, useState } from 'react';

interface ExifData {
  [key: string]: unknown;
}

interface FileExifData {
  file: string;
  filePath: string;
  exif: ExifData;
  error?: string;
}

const getSelectedFilePaths = async (): Promise<string[]> => {
  try {
    const selectedItems = await getSelectedFinderItems();
    return selectedItems.map(item => item.path);
  } catch {
    return [];
  }
};

const getErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) return 'Failed to read EXIF data';

  if (error.message.includes('command not found')) {
    return 'ifex CLI tool not found. Please install ifex first.';
  }
  if (error.message.includes('No such file')) {
    return 'File not found';
  }
  return error.message;
};

const processExifFile = (filePath: string, envPath: string): FileExifData => {
  try {
    const command = `ifex read --json "${filePath}"`;
    const output = execSync(command, {
      encoding: 'utf8',
      env: { ...process.env, PATH: envPath },
    });
    const exifData = JSON.parse(output);
    const actualExifData = Array.isArray(exifData) ? exifData[0]?.exif || {} : exifData;

    return {
      file: path.basename(filePath),
      filePath: filePath,
      exif: actualExifData,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    return {
      file: path.basename(filePath),
      filePath: filePath,
      exif: {},
      error: errorMessage,
    };
  }
};

export default function ViewExifCommand() {
  const [files, setFiles] = useState<FileExifData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadExifData = useCallback(async () => {
    try {
      const envPath = `${os.homedir()}/.cargo/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH}`;
      const filePaths = await getSelectedFilePaths();

      if (filePaths.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'No files found',
          message: 'Please select image files in Finder first',
        });
        setIsLoading(false);
        return;
      }

      const fileExifData = filePaths.map(filePath => processExifFile(filePath, envPath));
      setFiles(fileExifData);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Error loading files',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExifData();
  }, [loadExifData]);

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading EXIF data..." />;
  }

  if (files.length === 0) {
    return (
      <Detail
        markdown={`# No Image Files Found\n\nSelect image files in Finder first, then run this command to view EXIF data.`}
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={loadExifData} />
          </ActionPanel>
        }
      />
    );
  }

  // Create markdown content for all files
  const allFilesMarkdown = files
    .map(fileData => {
      if (fileData.error) {
        return `## ❌ ${fileData.file}\n\nError: ${fileData.error}\n\n---\n\n`;
      }

      const exifEntries = Object.entries(fileData.exif);

      // Format key names to be more readable
      const formatKey = (key: string) => {
        return key
          .replace(/\[Tag.*?\]/g, '') // Remove [Tag(...)] parts
          .replace(/IPTC:\s*/, '') // Remove IPTC: prefix
          .trim();
      };

      const formatFraction = (str: string): string => {
        const parts = str.split('/');
        if (parts.length !== 2) return str;

        const num1 = Number(parts[0]);
        const num2 = Number(parts[1]);

        if (Number.isNaN(num1) || Number.isNaN(num2)) return str;

        const result = num1 / num2;
        return result % 1 === 0 ? result.toString() : result.toFixed(2);
      };

      // Format values to be more readable
      const formatValue = (value: unknown) => {
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }

        const str = String(value);

        if (str.includes('/')) {
          return formatFraction(str);
        }

        return str;
      };

      // Group EXIF data by category
      const cameraInfo = exifEntries.filter(
        ([key]) => key.includes('Make') || key.includes('Model') || key.includes('Lens')
      );

      const exposureInfo = exifEntries.filter(
        ([key]) =>
          key.includes('ISO') ||
          key.includes('Focal') ||
          key.includes('Aperture') ||
          key.includes('Speed')
      );

      const dateInfo = exifEntries.filter(([key]) => key.includes('Date') || key.includes('Time'));

      const otherInfo = exifEntries.filter(
        ([key]) =>
          !(
            cameraInfo.some(([k]) => k === key) ||
            exposureInfo.some(([k]) => k === key) ||
            dateInfo.some(([k]) => k === key) ||
            key.includes('file')
          )
      );

      const renderSection = (title: string, entries: [string, unknown][]) => {
        if (entries.length === 0) return '';

        const rows = entries.map(([key, value]) => `| ${formatKey(key)} | ${formatValue(value)} |`);
        const table = ['| Property | Value |', '|:---------|:------|', ...rows].join('\n');

        return `### ${title}\n\n${table}\n\n`;
      };

      return `## 📷 ${fileData.file}

![${fileData.file}](file://${fileData.filePath})

${exifEntries.length === 0 ? 'No EXIF data found in this file.' : ''}

${renderSection('📷 Camera & Lens', cameraInfo)}
${renderSection('⚙️ Exposure Settings', exposureInfo)}
${renderSection('📅 Date & Time', dateInfo)}
${renderSection('📋 Other Information', otherInfo)}

---

`;
    })
    .join('');

  return (
    <Detail
      markdown={allFilesMarkdown}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={loadExifData} />
          {files.length > 0 && !files[0].error && (
            <Action.OpenWith title="Open First Image" path={files[0].filePath} />
          )}
        </ActionPanel>
      }
    />
  );
}
