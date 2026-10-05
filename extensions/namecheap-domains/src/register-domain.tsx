import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  LaunchProps,
  open,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { showNamecheapError } from "./errors";
import { feeNote, formatPrice, hasExtraFees, priceForDomain, priceLabel, totalFirstTerm } from "./domain/price";
import { isValidDomain, normalizeInput } from "./domain/normalize";
import { getClient, getPricing, isSandbox } from "./preferences";
import { registrationUrl, whoisUrl } from "./namecheap/urls";

const TERMS = [1, 2, 3, 5, 10];

interface FormValues {
  domain: string;
  years: string;
}

export function RegisterDomainForm({ initialDomain = "" }: { initialDomain?: string }) {
  const [isChecking, setIsChecking] = useState(false);

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    initialValues: { domain: normalizeInput(initialDomain), years: "1" },
    validation: {
      domain: (value) => {
        const domain = normalizeInput(value ?? "");
        if (!domain) return "Enter a domain name";
        if (!domain.includes(".")) return "Include the TLD, for example acme.com";
        if (!isValidDomain(domain)) return "This is not a valid domain name";
        return undefined;
      },
      years: FormValidation.Required,
    },
    async onSubmit(submitted) {
      const domain = normalizeInput(submitted.domain);
      const years = Number(submitted.years) || 1;
      setIsChecking(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: `Checking ${domain}…` });

      try {
        const client = await getClient();
        const [check] = await client.checkDomains([domain]);

        if (!check) throw new Error("Namecheap returned no result for this domain.");

        if (check.errorNo !== 0) {
          toast.style = Toast.Style.Failure;
          toast.title = `Cannot check ${domain}`;
          toast.message = check.description || `Namecheap error ${check.errorNo}`;
          return;
        }

        if (!check.available) {
          toast.style = Toast.Style.Failure;
          toast.title = `${domain} is taken`;
          toast.message = "Try a different name or TLD";
          toast.primaryAction = {
            title: "Look up Whois",
            onAction: () => {
              open(whoisUrl(domain, isSandbox()));
            },
          };
          return;
        }

        const pricing = await getPricing().catch(() => ({}));
        const price = priceForDomain(domain, pricing, years, check);
        const priceLine = !price
          ? "Namecheap has not quoted a price for this TLD. The price is shown at checkout."
          : price.eapFee > 0
            ? `This TLD is in its Early Access Program, ${feeNote(price)}. The real cost is shown at checkout.`
            : hasExtraFees(price)
              ? `${priceLabel(price, years)}, ${feeNote(price)}. First term about ${formatPrice(totalFirstTerm(price), price.currency)}.`
              : priceLabel(price, years);

        toast.hide();

        const confirmed = await confirmAlert({
          title: `${domain} is available`,
          message: `${priceLine}\n\nNamecheap checkout opens in your browser, where you confirm the term, privacy and payment. Nothing is charged from Raycast.`,
          icon: Icon.Cart,
          primaryAction: { title: "Continue to Namecheap", style: Alert.ActionStyle.Default },
          dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
        });

        if (!confirmed) return;

        await open(registrationUrl(domain, isSandbox()));
        await showToast({ style: Toast.Style.Success, title: `Opened checkout for ${domain}` });
        await popToRoot();
      } catch (error) {
        await showNamecheapError(error, `Could not check ${domain}`);
      } finally {
        setIsChecking(false);
      }
    },
  });

  const domainPreview = normalizeInput(values.domain ?? "");

  return (
    <Form
      isLoading={isChecking}
      navigationTitle={isSandbox() ? "Register Domain (Sandbox)" : "Register Domain"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Check and Continue" icon={Icon.Cart} onSubmit={handleSubmit} />
          {domainPreview && isValidDomain(domainPreview) ? (
            <Action.OpenInBrowser
              title="Open on Namecheap Without Checking"
              icon={Icon.Globe}
              url={registrationUrl(domainPreview, isSandbox())}
              shortcut={Keyboard.Shortcut.Common.OpenWith}
            />
          ) : null}
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="How this works"
        text="Availability and price are verified through the Namecheap API. The purchase itself is completed on namecheap.com, so your account balance is never charged from Raycast."
      />
      <Form.TextField
        title="Domain"
        placeholder="acme.com"
        info="Include the TLD. Internationalized names are converted to punycode."
        {...itemProps.domain}
      />
      <Form.Dropdown title="Term" info="Registration length used for the price estimate." {...itemProps.years}>
        {TERMS.map((term) => (
          <Form.Dropdown.Item key={term} value={String(term)} title={term === 1 ? "1 year" : `${term} years`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.RegisterDomain }>) {
  return <RegisterDomainForm initialDomain={props.arguments?.domain ?? props.fallbackText ?? ""} />;
}
