import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { upsertAccount } from "./storage";
import {
  decodeBase32,
  normalizeBase32,
  parseOtpauthUrl,
  stableAccountId,
} from "./totp";
import type { TotpAccount, TotpAlgorithm, TotpDigits } from "./types";

type FormValues = {
  otpauthUrl: string;
  issuer: string;
  account: string;
  secretBase32: string;
  digits: string;
  period: string;
  algorithm: string;
};

function buildAccount(values: FormValues): TotpAccount {
  const maybeUrl = values.otpauthUrl.trim();
  if (maybeUrl) {
    const parsed = parseOtpauthUrl(maybeUrl);
    return {
      id: stableAccountId(parsed),
      ...parsed,
      createdAt: new Date().toISOString(),
    };
  }

  const issuer = values.issuer.trim();
  const account = values.account.trim();
  const secretBase32 = normalizeBase32(values.secretBase32.trim());
  const digits = Number(values.digits) as TotpDigits;
  const period = Number(values.period);
  const algorithm = values.algorithm.toUpperCase() as TotpAlgorithm;

  if (!issuer || !account) {
    throw new Error("Issuer and Account are required");
  }
  decodeBase32(secretBase32);
  if (digits !== 6 && digits !== 8) {
    throw new Error("Invalid Digits. Use 6 or 8");
  }
  if (!Number.isInteger(period) || period < 1 || period > 300) {
    throw new Error("Invalid Period. Use an integer between 1 and 300");
  }
  if (!["SHA1", "SHA256", "SHA512"].includes(algorithm)) {
    throw new Error("Invalid Algorithm. Use SHA1, SHA256 or SHA512");
  }

  return {
    id: stableAccountId({
      issuer,
      account,
      secretBase32,
      digits,
      period,
      algorithm,
    }),
    issuer,
    account,
    secretBase32,
    digits,
    period,
    algorithm,
    createdAt: new Date().toISOString(),
  };
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [values, setValues] = useState<FormValues>({
    otpauthUrl: "",
    issuer: "",
    account: "",
    secretBase32: "",
    digits: "6",
    period: "30",
    algorithm: "SHA1",
  });

  function autofillFromUrl() {
    const url = values.otpauthUrl.trim();
    if (!url) {
      void showFailureToast(new Error("Paste an otpauth URL first"), {
        title: "Autofill Failed",
      });
      return;
    }
    try {
      const parsed = parseOtpauthUrl(url);
      setValues((prev) => ({
        ...prev,
        issuer: parsed.issuer,
        account: parsed.account,
        secretBase32: parsed.secretBase32,
        digits: String(parsed.digits),
        period: String(parsed.period),
        algorithm: parsed.algorithm,
      }));
      void showToast({
        style: Toast.Style.Success,
        title: "Fields Autofilled",
      });
    } catch (e) {
      void showFailureToast(e, { title: "Autofill Failed" });
    }
  }

  async function handleSubmit(values: FormValues) {
    try {
      setIsLoading(true);
      const account = buildAccount(values);
      await upsertAccount(account);
      await showToast({ style: Toast.Style.Success, title: "Account saved" });
    } catch (e) {
      await showFailureToast(e, { title: "Failed to save" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Account" onSubmit={handleSubmit} />
          <Action
            title="Autofill Fields from URL"
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onAction={autofillFromUrl}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Recommended: paste an otpauth URL. Manual fields are optional fallback." />
      <Form.TextField
        id="otpauthUrl"
        title="Otpauth URL"
        placeholder="otpauth://totp/..."
        value={values.otpauthUrl}
        onChange={(value) =>
          setValues((prev) => ({ ...prev, otpauthUrl: value }))
        }
      />
      <Form.Separator />
      <Form.TextField
        id="issuer"
        title="Issuer"
        placeholder="GitHub"
        value={values.issuer}
        onChange={(value) => setValues((prev) => ({ ...prev, issuer: value }))}
      />
      <Form.TextField
        id="account"
        title="Account"
        placeholder="user@example.com"
        value={values.account}
        onChange={(value) => setValues((prev) => ({ ...prev, account: value }))}
      />
      <Form.PasswordField
        id="secretBase32"
        title="Secret Base32"
        placeholder="JBSWY3DPEHPK3PXP"
        value={values.secretBase32}
        onChange={(value) =>
          setValues((prev) => ({ ...prev, secretBase32: value }))
        }
      />
      <Form.Dropdown
        id="digits"
        title="Digits"
        value={values.digits}
        onChange={(value) => setValues((prev) => ({ ...prev, digits: value }))}
      >
        <Form.Dropdown.Item value="6" title="6" />
        <Form.Dropdown.Item value="8" title="8" />
      </Form.Dropdown>
      <Form.TextField
        id="period"
        title="Period (s)"
        placeholder="30"
        value={values.period}
        onChange={(value) => setValues((prev) => ({ ...prev, period: value }))}
      />
      <Form.Dropdown
        id="algorithm"
        title="Algorithm"
        value={values.algorithm}
        onChange={(value) =>
          setValues((prev) => ({ ...prev, algorithm: value }))
        }
      >
        <Form.Dropdown.Item value="SHA1" title="SHA1" />
        <Form.Dropdown.Item value="SHA256" title="SHA256" />
        <Form.Dropdown.Item value="SHA512" title="SHA512" />
      </Form.Dropdown>
    </Form>
  );
}
