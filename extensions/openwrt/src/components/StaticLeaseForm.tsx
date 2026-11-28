import { isIPv4 } from "node:net";
import { useRef, useState } from "react";
import { Action, ActionPanel, Form, Icon, Toast, getPreferenceValues, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { invalidateCachedKey } from "../lib/cache";
import { addStaticDhcpLease } from "../lib/openwrt-extras";
import type { ExtensionPreferences } from "../lib/types";
import { getErrorDescription } from "../lib/ubus";

export interface StaticLeaseFormProps {
  initialName?: string;
  initialMac?: string;
  initialIp?: string;
  onSuccess?: () => void;
}

interface StaticLeaseFormValues {
  name: string;
  mac: string;
  ip: string;
  leasetime: string;
}

const HOSTNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const MAC_PATTERN = /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/;
const LEASETIME_PATTERN = /^(\d+[smhdw]?|infinite)$/i;

function normalizeMacInput(raw: string): string {
  return raw.trim().replace(/-/g, ":").toUpperCase();
}

/** Form view to create a new UCI static DHCP lease (`host` section) on OpenWrt. */
export function StaticLeaseForm({ initialName, initialMac, initialIp, onSuccess }: StaticLeaseFormProps) {
  const { pop } = useNavigation();
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, itemProps } = useForm<StaticLeaseFormValues>({
    initialValues: {
      name: initialName ?? "",
      mac: initialMac ?? "",
      ip: initialIp ?? "",
      leasetime: "",
    },
    validation: {
      name: (value) => {
        const trimmed = (value ?? "").trim();
        if (!trimmed || !HOSTNAME_PATTERN.test(trimmed)) {
          return "Enter a valid hostname (letters, digits, '.', '_', or '-', not starting with '-').";
        }
      },
      mac: (value) => {
        if (!MAC_PATTERN.test(normalizeMacInput(value ?? ""))) {
          return "Enter a valid MAC address in AA:BB:CC:DD:EE:FF format.";
        }
      },
      ip: (value) => {
        if (!isIPv4((value ?? "").trim())) {
          return "Enter a valid IPv4 address (for example 192.168.1.50).";
        }
      },
      leasetime: (value) => {
        const trimmed = (value ?? "").trim();
        if (trimmed && !LEASETIME_PATTERN.test(trimmed)) {
          return "Use a duration such as 12h, 30m, 3600, or infinite.";
        }
      },
    },
    async onSubmit(values) {
      if (submittingRef.current) {
        return;
      }

      const trimmedName = values.name.trim();
      const normalizedMac = normalizeMacInput(values.mac);
      const trimmedIp = values.ip.trim();
      const trimmedLeasetime = values.leasetime.trim();

      submittingRef.current = true;
      setIsSubmitting(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Saving static lease for ${trimmedName}...`,
      });

      try {
        const prefs = getPreferenceValues<ExtensionPreferences>();
        await addStaticDhcpLease(
          {
            name: trimmedName,
            mac: normalizedMac,
            ip: trimmedIp,
            leasetime: trimmedLeasetime || undefined,
          },
          prefs,
        );
        invalidateCachedKey("dhcp-dns", prefs.routerUrl, "", prefs.username?.trim() || "root");
        toast.style = Toast.Style.Success;
        toast.title = "Static DHCP Lease Added";
        toast.message = `${trimmedName} (${trimmedIp})`;
        onSuccess?.();
        pop();
      } catch (err) {
        await toast.hide();
        const { title, message } = getErrorDescription(err);
        await showFailureToast(message, { title });
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
  });

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Add Static DHCP Lease"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Static DHCP Lease" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Hostname" placeholder="nas" {...itemProps.name} />
      <Form.TextField title="MAC Address" placeholder="AA:BB:CC:DD:EE:FF" {...itemProps.mac} />
      <Form.TextField title="IPv4 Address" placeholder="192.168.1.50" {...itemProps.ip} />
      <Form.TextField
        title="Lease Time"
        placeholder="12h"
        info="Optional lease duration (for example 12h, 30m, or infinite). Leave blank for the router default."
        {...itemProps.leasetime}
      />
    </Form>
  );
}
