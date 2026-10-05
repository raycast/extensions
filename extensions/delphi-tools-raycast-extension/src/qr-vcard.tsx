import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

import { DelphitoolsRequired } from "./delphitools-install";
import {
  generateQr,
  parsePositiveInteger,
  validateLogoSelection,
  QrErrorLevel,
} from "./qr-helper";
import { QrDetail } from "./qr";

type FormValues = {
  firstName: string;
  lastName: string;
  organization: string;
  jobTitle: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  size: string;
  foreground: string;
  background: string;
  logo: string[];
  errorLevel: QrErrorLevel;
};

export default function Command() {
  return (
    <DelphitoolsRequired>
      {({ isCheckingInstall }) => (
        <QrVCardForm isCheckingInstall={isCheckingInstall} />
      )}
    </DelphitoolsRequired>
  );
}

function QrVCardForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  async function handleSubmit(values: FormValues) {
    const firstName = values.firstName.trim();
    const lastName = values.lastName.trim();
    const organization = values.organization.trim();
    const jobTitle = values.jobTitle.trim();
    const email = values.email.trim();
    const phone = values.phone.trim();
    const website = values.website.trim();
    const address = values.address.trim();

    if (
      !firstName &&
      !lastName &&
      !organization &&
      !jobTitle &&
      !email &&
      !phone &&
      !website &&
      !address
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "At least one field is required",
        message:
          "Please fill in at least one contact field to generate a vCard.",
      });
      return;
    }

    const size = parsePositiveInteger(values.size, "Size");
    if (size instanceof Error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid size",
        message: size.message,
      });
      return;
    }

    const logoError = validateLogoSelection(values.logo);
    if (logoError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid logo file",
        message: logoError,
      });
      return;
    }

    const escapedFirstName = escapeVCardText(firstName);
    const escapedLastName = escapeVCardText(lastName);
    const escapedFullName = escapeVCardText(`${firstName} ${lastName}`.trim());

    const vCardLines = ["BEGIN:VCARD", "VERSION:3.0"];
    vCardLines.push(`N:${escapedLastName};${escapedFirstName};;;`);
    vCardLines.push(`FN:${escapedFullName}`);

    if (organization) vCardLines.push(`ORG:${escapeVCardText(organization)}`);
    if (jobTitle) vCardLines.push(`TITLE:${escapeVCardText(jobTitle)}`);
    if (email) vCardLines.push(`EMAIL:${escapeVCardText(email)}`);
    if (phone) vCardLines.push(`TEL:${escapeVCardText(phone)}`);
    if (website) vCardLines.push(`URL:${escapeVCardText(website)}`);
    if (address) vCardLines.push(`ADR:;;${escapeVCardText(address)};;;;`);

    vCardLines.push("END:VCARD");
    const vCardText = vCardLines.join("\n");

    const fg = values.foreground.trim() || "#000000";
    const bg = values.background.trim() || "#ffffff";
    const logoPath =
      values.logo && values.logo.length > 0 ? values.logo[0] : undefined;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating vCard QR Code...",
      });

      const result = await generateQr({
        data: vCardText,
        size,
        foreground: fg,
        background: bg,
        logo: logoPath,
        errorLevel: values.errorLevel,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "vCard QR Code generated successfully",
      });

      push(<QrDetail result={{ ...result, vCardText }} />);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate vCard QR Code",
        message,
      });
    }
  }

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Code}
            title="Generate QR Code"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="firstName" title="First Name" placeholder="Jane" />
      <Form.TextField id="lastName" title="Last Name" placeholder="Doe" />
      <Form.TextField
        id="organization"
        title="Organization"
        placeholder="Acme Corp"
      />
      <Form.TextField
        id="jobTitle"
        title="Job Title"
        placeholder="Software Engineer"
      />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="jane.doe@example.com"
      />
      <Form.TextField id="phone" title="Phone" placeholder="+1234567890" />
      <Form.TextField
        id="website"
        title="Website"
        placeholder="https://example.com"
      />
      <Form.TextField
        id="address"
        title="Address"
        placeholder="123 Main St, City, Country"
      />

      <Form.Separator />

      <Form.TextField
        id="size"
        title="Size"
        placeholder="Size in pixels (e.g. 512)"
        defaultValue="512"
      />
      <Form.TextField
        id="foreground"
        title="Foreground Color"
        placeholder="Hex color (e.g. #000000)"
        defaultValue="#000000"
      />
      <Form.TextField
        id="background"
        title="Background Color"
        placeholder="Hex color or 'transparent' (e.g. #ffffff)"
        defaultValue="#ffffff"
      />
      <Form.FilePicker
        id="logo"
        title="Logo Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.Dropdown
        id="errorLevel"
        title="Error Correction Level"
        defaultValue="M"
      >
        <Form.Dropdown.Item title="L - Low (7%)" value="L" />
        <Form.Dropdown.Item title="M - Medium (15%)" value="M" />
        <Form.Dropdown.Item title="Q - Quartile (25%)" value="Q" />
        <Form.Dropdown.Item title="H - High (30%)" value="H" />
      </Form.Dropdown>
    </Form>
  );
}

function escapeVCardText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
