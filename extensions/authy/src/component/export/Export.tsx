import { Action, ActionPanel, environment, Form, getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { homedir } from "node:os";
import { APPS_KEY, getFromCache, SERVICES_KEY } from "../../cache";
import { encode } from "hi-base32";
import { AppEntry, AppsResponse, AuthenticatorToken, ServicesResponse } from "../../client/dto";
import * as fs from "node:fs";
import { decryptSeed } from "../../util/totp";
import protobuf from "protobufjs";
import qrcode from "qrcode";

const { authyPassword } = getPreferenceValues<{ authyPassword: string }>();

interface Options {
  folder: string;
  authyData: boolean;
  decryptedData: boolean;
  authUrl: boolean;
  googleExport: boolean;
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

function decryptData(apps: AppEntry[], services: AuthenticatorToken[]) {
  const decryptedApps: DecryptedData[] = apps.map((i) => {
    return {
      name: i.name,
      seed: encode(Buffer.from(i.secret_seed, "hex")),
      algorithm: "SHA1",
      digits: i.digits,
      period: 10,
    };
  });

  const decryptedServices: DecryptedData[] = services.map((i) => {
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
  const appsResponse: AppsResponse = await getFromCache(APPS_KEY);
  const servicesResponse: ServicesResponse = await getFromCache(SERVICES_KEY);
  const apps = appsResponse.apps;
  const services = servicesResponse.authenticator_tokens;
  const exportDir = `${options.folder}/authy_export`;
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }
  if (options.authyData) {
    fs.writeFile(`${exportDir}/authy_apps_response.json`, JSON.stringify(appsResponse, undefined, 2), async (err) => {
      if (err) {
        await showFailedToast(err.message);
      }
    });

    fs.writeFile(
      `${exportDir}/authy_authenticator_tokens_response.json`,
      JSON.stringify(servicesResponse, undefined, 2),
      async (err) => {
        if (err) {
          await showFailedToast(err.message);
        }
      }
    );
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

  if (options.googleExport) {
    const decryptedData = decryptData([], services);

    const root = protobuf.loadSync(`${environment.assetsPath}/google_authenticator.proto`);

    const MigrationPayload = root.lookupType("MigrationPayload");

    const batchSize = Math.floor(decryptedData.length / 10) + (decryptedData.length % 10 > 0 ? 1 : 0);
    for (let i = 0, j = 0; i < decryptedData.length; i += 10, j += 1) {
      const elements = decryptedData.slice(i, i + 10);
      // handle this set
      const payload = {
        otpParameters: elements.map((i) => {
          return {
            secret: Buffer.from(i.seed ? i.seed : ""),
            name: i.name,
            issuer: i.issuer,
            algorithm: 1, // ALGORITHM_SHA1
            digits: i.digits == 6 ? 1 : i.digits == 8 ? 2 : 0, // digit count DIGIT_COUNT_SIX or DIGIT_COUNT_EIGHT or DIGIT_COUNT_UNSPECIFIED
            type: 2, // OTP_TYPE_TOTP
            counter: i.period,
          };
        }),
        version: 2,
        batchSize: batchSize,
        batchIndex: j,
      };

      const errMsg = MigrationPayload.verify(payload);
      if (errMsg) {
        await showFailedToast(errMsg);
      }

      const message = MigrationPayload.create(payload);
      const buffer = MigrationPayload.encode(message).finish();
      const result = Buffer.from(buffer).toString("base64");
      const url = `otpauth-migration://offline?data=${result}`;

      qrcode.toFile(`${exportDir}/google_authenticator_${j}.png`, url, (err) => {
        if (err) {
          showFailedToast(err.message);
        }
      });
    }
  }

  await showToast({
    style: Toast.Style.Success,
    title: "Twilio’s Authy",
    message: `Data Exported Check Export Folder: ${exportDir}`,
  });

  await open(exportDir);
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
        label={"Export decrypted data"}
        id={"decryptedData"}
        info={"Export decrypted seeds and options to generate OTPs"}
      />
      <Form.Checkbox
        label={"Generate otpauth urls"}
        id={"authUrl"}
        info={"Export data in otpauth url format which can be used to generate QR code and scan by other 2FA apps"}
      />
      <Form.Checkbox
        label={"Generate Google Authenticator format"}
        id={"googleExport"}
        info={"Export data in Google Authenticator format. Exports only 3rd party services aka 6 digit codes"}
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
