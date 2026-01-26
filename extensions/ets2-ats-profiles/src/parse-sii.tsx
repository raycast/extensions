import { Action, ActionPanel, Form, showHUD, showToast, Toast, showInFinder } from "@raycast/api";
import { useForm } from "@raycast/utils";
import fs from "node:fs";
import path from "node:path";
import { parseSiiFile } from "sii-parse-ts";
import { isValidSiiPath, isEncryptedSiiFile, decryptSiiToFile } from "./services/siiService";

interface ParseSiiFormValues {
  siiFile: string[];
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<ParseSiiFormValues>({
    async onSubmit(values) {
      const siiFilePath = values.siiFile[0];

      if (!siiFilePath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Please select an SII file",
        });
        return;
      }

      if (!isValidSiiPath(siiFilePath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid File",
          message: "Please select a valid .sii file",
        });
        return;
      }

      try {
        let fileToProcess = siiFilePath;
        let decryptedFilePath: string | null = null;

        // Check if file is encrypted and decrypt if necessary
        if (isEncryptedSiiFile(siiFilePath)) {
          await showToast({
            title: "Decrypting...",
            message: path.basename(siiFilePath),
            style: Toast.Style.Animated,
          });

          try {
            const fileName = path.basename(siiFilePath, ".sii");
            const directory = path.dirname(siiFilePath);
            const decryptedPath = path.join(directory, `${fileName}_decrypted.sii`);

            await decryptSiiToFile(siiFilePath, decryptedPath);
            decryptedFilePath = decryptedPath;
            fileToProcess = decryptedFilePath;

            await showToast({
              title: "Decryption Complete",
              message: "File decrypted successfully",
              style: Toast.Style.Success,
            });
          } catch (decryptError) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Decryption Failed",
              message: decryptError instanceof Error ? decryptError.message : "Unknown decryption error",
            });
            return;
          }
        }

        await showToast({
          title: "Parsing...",
          message: path.basename(fileToProcess),
          style: Toast.Style.Animated,
        });

        const parsedSii = await parseSiiFile(fileToProcess);

        await showToast({
          title: "Writing...",
          message: "Creating output.json",
          style: Toast.Style.Animated,
        });

        const outputPath = path.join(path.dirname(siiFilePath), "output.json");
        fs.writeFileSync(outputPath, JSON.stringify(parsedSii, null, 2));

        await showHUD("SII file parsed successfully");

        // Show the output file in Finder
        await showInFinder(outputPath);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Parsing Failed",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
    validation: {
      siiFile: (value) => {
        if (!value || value.length === 0) {
          return "Please select an SII file";
        }
        if (!isValidSiiPath(value[0])) {
          return "Please select a valid .sii file";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Parse SII File" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        title="Select SII File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
        {...itemProps.siiFile}
      />
      <Form.Description text="Select an .sii file to parse. If the file is encrypted, it will be automatically decrypted first. The output will be saved as 'output.json' in the same directory and opened in Finder." />
    </Form>
  );
}
