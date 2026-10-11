import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { deduplicateImports } from "../vendor/lib/data-transfer";
import { normalizeNewAccountInput } from "../vendor/lib/account-validation";
import type { AccountData, NewAccountInput } from "../vendor/lib/types";
import { commit } from "./lib/commit";
import { t } from "./lib/i18n";
import { addAccounts, setAccountText } from "./lib/vault-ops";
import { getVaultState } from "./lib/vault-store";

function nextAccountName(existingNames: string[]): string {
  const names = new Set(existingNames);
  let index = 1;
  while (names.has(`Account ${index}`) || names.has(`账户 ${index}`)) index++;
  return t(`Account ${index}`, `账户 ${index}`);
}

interface FormValues {
  name?: string;
  issuer?: string;
  secret?: string;
  type?: "totp" | "hotp";
  digits?: string;
  period?: string;
  counter?: string;
  algorithm?: "SHA-1" | "SHA-256" | "SHA-512";
  note?: string;
  remark?: string;
}

export default function AccountForm({
  mode,
  account,
  initial,
}: {
  mode: "create" | "edit";
  account?: AccountData;
  initial?: NewAccountInput;
}) {
  const { pop } = useNavigation();
  const [type, setType] = useState<"totp" | "hotp">(initial?.type ?? "totp");
  return (
    <Form
      navigationTitle={
        initial
          ? t("Edit Scanned Account", "编辑扫描结果")
          : mode === "create"
            ? t("Add Account", "添加账户")
            : t("Edit Account", "编辑账户")
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("Save Account", "保存账户")}
            onSubmit={async (values: FormValues) => {
              if (mode === "create") {
                const { accounts, status } = getVaultState();
                if (status !== "ready") {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t("Please wait for accounts to load", "请等待账户载入完成"),
                  });
                  return;
                }
                const name =
                  values.name?.trim() ||
                  values.issuer?.trim() ||
                  nextAccountName(accounts.map((existing) => existing.name));
                const input = normalizeNewAccountInput({
                  ...initial,
                  name,
                  issuer: values.issuer ?? "",
                  secret: values.secret,
                  type: values.type,
                  digits: values.digits,
                  period: values.period,
                  counter: values.counter ?? initial?.counter ?? 0,
                  algorithm: values.algorithm,
                  note: values.note,
                  remark: values.remark,
                });
                if (!input) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t("Invalid account details", "账户信息不合法"),
                    message: t(
                      "Check the Base32 secret and TOTP/HOTP settings.",
                      "请检查 Base32 密钥和 TOTP/HOTP 参数。",
                    ),
                  });
                  return;
                }
                if (!deduplicateImports([input], getVaultState().accounts).newAccounts.length) {
                  await showToast({ style: Toast.Style.Failure, title: t("Account Already Exists", "账户已存在") });
                  return;
                }
                const ok = await commit(
                  (snapshot) => addAccounts(snapshot, [input], input.groupId ?? null),
                  t("Account added", "已添加账户"),
                );
                if (ok) pop();
                return;
              }
              if (!account) return;
              const ok = await commit(
                (snapshot) =>
                  setAccountText(snapshot, account.id, {
                    name: values.name || account.name,
                    issuer: values.issuer ?? account.issuer,
                    note: values.note,
                    remark: values.remark,
                  }),
                t("Account saved", "已保存账户"),
              );
              if (ok) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={t("Name", "名称")}
        defaultValue={initial?.name ?? account?.name}
        placeholder="alice@example.com"
      />
      <Form.TextField
        id="issuer"
        title={t("Issuer", "发行方")}
        defaultValue={initial?.issuer ?? account?.issuer}
        placeholder="GitHub"
      />
      {mode === "create" && (
        <>
          <Form.PasswordField id="secret" title={t("Base32 Secret", "Base32 密钥")} defaultValue={initial?.secret} />
          <Form.Description
            text={t(
              "Review the account details before saving. Scanned QR settings are filled in automatically.",
              "保存前请确认账户信息，二维码参数会自动填入。",
            )}
          />
        </>
      )}
      <Form.TextArea id="note" title={t("Note", "备注")} defaultValue={initial?.note ?? account?.note} />
      <Form.TextArea id="remark" title={t("Remark", "标记")} defaultValue={initial?.remark ?? account?.remark} />
      {mode === "create" && (
        <>
          <Form.Separator />
          <Form.Dropdown
            id="type"
            title={t("Type", "类型")}
            value={type}
            onChange={(value) => setType(value as "totp" | "hotp")}
          >
            <Form.Dropdown.Item value="totp" title="TOTP" />
            <Form.Dropdown.Item value="hotp" title="HOTP" />
          </Form.Dropdown>
          <Form.Dropdown id="digits" title={t("Digits", "位数")} defaultValue={String(initial?.digits ?? 6)}>
            <Form.Dropdown.Item value="6" title="6" />
            <Form.Dropdown.Item value="8" title="8" />
          </Form.Dropdown>
          {type === "totp" ? (
            <Form.TextField
              id="period"
              title={t("Period (seconds)", "周期（秒）")}
              defaultValue={String(initial?.period ?? 30)}
            />
          ) : (
            <Form.TextField id="counter" title={t("Counter", "计数器")} defaultValue={String(initial?.counter ?? 0)} />
          )}
          <Form.Dropdown id="algorithm" title={t("Algorithm", "算法")} defaultValue={initial?.algorithm ?? "SHA-1"}>
            <Form.Dropdown.Item value="SHA-1" title="SHA-1" />
            <Form.Dropdown.Item value="SHA-256" title="SHA-256" />
            <Form.Dropdown.Item value="SHA-512" title="SHA-512" />
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}
