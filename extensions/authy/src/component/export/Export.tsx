import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { homedir } from "node:os";
import { APPS_KEY, getFromCache, SERVICES_KEY } from "../../cache";
import { encode } from "hi-base32";
import { AppsResponse, ServicesResponse } from "../../client/dto";
import * as fs from "node:fs";
import { decryptSeed } from "../../util/totp";

const { authyPassword } = getPreferenceValues<{ authyPassword: string }>();

interface Options {
  folder: string;
  authyData: boolean;
  decryptedData: boolean;
  authUrl: boolean;
}

interface DecryptedData {
  name: string;
  issuer?: string;
  seed: string | null;
  algorithm: "SHA1" | "SHA256" | "SHA512";
  digits: number;
  period: number;
}

async function showFailedToast(message: string) {
  await showToast({
    style: Toast.Style.Failure,
    title: "Twilio’s Authy",
    message: message,
  });
}

function decryptData(apps: AppsResponse, services: ServicesResponse) {
  const decryptedApps: DecryptedData[] = apps.apps.map((i) => {
    return {
      name: i.name,
      seed: encode(Buffer.from(i.secret_seed, "hex")),
      algorithm: "SHA1",
      digits: i.digits,
      period: 10,
    };
  });

  const decryptedServices: DecryptedData[] = services.authenticator_tokens.map((i) => {
    return {
      name: i.original_name || i.name,
      issuer: i.issuer,
      seed: decryptSeed(i.encrypted_seed, i.salt, authyPassword, i.key_derivation_iterations || 1000),
      algorithm: "SHA1",
      digits: i.digits,
      period: 30,
    };
  });
  return [...decryptedApps, ...decryptedServices];
}

async function exportData(options: Options) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Twilio’s Authy",
    message: "Exporting Data",
  });
  const apps: AppsResponse = await getFromCache(APPS_KEY);
  const services: ServicesResponse = await getFromCache(SERVICES_KEY);
  const exportDir = `${options.folder}/authy_export`;
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }
  if (options.authyData) {
    fs.writeFile(`${exportDir}/authy_apps.json`, JSON.stringify(apps, undefined, 2), async (err) => {
      if (err) {
        await showFailedToast(err.message);
      }
    });

    fs.writeFile(`${exportDir}/authenticator_tokens.json`, JSON.stringify(services, undefined, 2), async (err) => {
      if (err) {
        await showFailedToast(err.message);
      }
    });
  }
  if (options.decryptedData) {
    const decryptedData = decryptData(apps, services);

    if (options.authyData) {
      fs.writeFile(`${exportDir}/decrypted_data.json`, JSON.stringify(decryptedData, undefined, 2), async (err) => {
        if (err) {
          await showFailedToast(err.message);
        }
      });
    }
  }
  if (options.authUrl) {
    const decryptedData = decryptData(apps, services);
    const baseUrl = "otpauth://totp";
    const urls = decryptedData
      .filter((i) => {
        return i.seed != null;
      })
      .map((i) => {
        const url = new URL(`${baseUrl}/${i.name}`);
        url.searchParams.append("secret", i.seed!);
        url.searchParams.append("algorithm", i.algorithm);
        url.searchParams.append("digits", i.digits.toString());
        url.searchParams.append("period", i.period.toString());
        if (i.issuer) {
          url.searchParams.append("issuer", i.issuer);
        }

        return url.toString();
      });
    fs.writeFile(`${exportDir}/otpauth_url.json`, JSON.stringify(urls, undefined, 2), async (err) => {
      if (err) {
        await showFailedToast(err.message);
      }
    });
  }
  await showToast({
    style: Toast.Style.Success,
    title: "Twilio’s Authy",
    message: "Data Exported Check Export Folder",
  });
}

export default function Export() {
  return (
    <Form
      navigationTitle={"Export Data"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export" onSubmit={async (values: Options) => await exportData(values)} />
        </ActionPanel>
      }
    >
      <Form.Description text={"Exporting data from Authy"} />
      <Form.Checkbox
        label={"Export raw Authy data"}
        id={"authyData"}
        info={"Export raw Auth API responses with encrypted data"}
      />
      <Form.Checkbox
        label={"Export decrypted seed and options"}
        id={"decryptedData"}
        info={"Export decrypted seeds and options to generate OTPs"}
      />
      <Form.Checkbox
        label={"Generate otpauth url"}
        id={"authUrl"}
        info={"Export data in otpauth url format which can be used to generate QR code and scan by other 2FA apps"}
      />
      <Form.FilePicker
        id="folder"
        title="Folder to save data"
        defaultValue={[`${homedir()}`]}
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />
    </Form>
  );
}
