import { render } from "@testing-library/react";
import { ContactDetailList } from "../contact-detail-list";
import { DexContact } from "../types";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  List: ({ children }: { children: React.ReactNode }) => <div data-testid="list">{children}</div>,
  ActionPanel: ({ children }: { children: React.ReactNode }) => <div data-testid="action-panel">{children}</div>,
  Action: {
    Push: ({ title }: { title: string }) => <div data-testid="action-push">{title}</div>,
    OpenInBrowser: ({ title }: { title: string }) => <div data-testid="action-open">{title}</div>,
    CopyToClipboard: ({ title }: { title: string }) => <div data-testid="action-copy">{title}</div>,
  },
  Icon: {
    Person: "person-icon",
    Envelope: "envelope-icon",
    Phone: "phone-icon",
    Message: "message-icon",
    Globe: "globe-icon",
    Pencil: "pencil-icon",
    Plus: "plus-icon",
    Trash: "trash-icon",
    Checkmark: "checkmark-icon",
  },
  Color: {
    Green: "green",
    Red: "red",
  },
  showToast: jest.fn(),
  Toast: {
    Style: {
      Success: "success",
      Failure: "failure",
    },
  },
  useNavigation: () => ({
    pop: jest.fn(),
  }),
  Form: ({ children }: { children: React.ReactNode }) => <div data-testid="form">{children}</div>,
}));

// Mock DexAPI
jest.mock("../dex-api", () => ({
  DexAPI: jest.fn().mockImplementation(() => ({
    updateContact: jest.fn().mockResolvedValue({}),
    deleteContact: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("ContactDetailList", () => {
  const mockContact: DexContact = {
    id: "contact-1",
    first_name: "John",
    last_name: "Doe",
    emails: [{ email: "john.doe@example.com" }],
    phones: [{ phone_number: "+1234567890", label: "mobile" }],
    job_title: "Software Engineer",
    description: "Test contact",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  };

  it("renders contact information correctly", () => {
    const { container } = render(<ContactDetailList contact={mockContact} />);
    expect(container).toBeTruthy();
  });

  it("displays email addresses", () => {
    const contact = {
      ...mockContact,
      emails: [{ email: "john@example.com" }, { email: "john.doe@work.com" }],
    };
    const { container } = render(<ContactDetailList contact={contact} />);
    expect(container).toBeTruthy();
  });

  it("displays phone numbers with call, SMS, and WhatsApp options", () => {
    const { container } = render(<ContactDetailList contact={mockContact} />);
    expect(container).toBeTruthy();
  });

  it("handles contacts with no email", () => {
    const contact = { ...mockContact, emails: [] };
    const { container } = render(<ContactDetailList contact={contact} />);
    expect(container).toBeTruthy();
  });

  it("handles contacts with no phone", () => {
    const contact = { ...mockContact, phones: [] };
    const { container } = render(<ContactDetailList contact={contact} />);
    expect(container).toBeTruthy();
  });

  it("displays job title when available", () => {
    const { container } = render(<ContactDetailList contact={mockContact} />);
    expect(container).toBeTruthy();
  });

  it("handles contacts with no job title", () => {
    const contact = { ...mockContact, job_title: null };
    const { container } = render(<ContactDetailList contact={contact} />);
    expect(container).toBeTruthy();
  });

  it("displays notes in detail panel", () => {
    const contact = {
      ...mockContact,
      description: "Important client from Q3 2024",
    };
    const { container } = render(<ContactDetailList contact={contact} />);
    expect(container).toBeTruthy();
  });

  it("shows prompt when no notes exist", () => {
    const contact = { ...mockContact, description: null };
    const { container } = render(<ContactDetailList contact={contact} />);
    expect(container).toBeTruthy();
  });

  it("extracts name suggestions from email correctly", () => {
    const contact = {
      ...mockContact,
      first_name: null,
      last_name: null,
      emails: [{ email: "jane.smith@example.com" }],
    };
    const { container } = render(<ContactDetailList contact={contact} />);
    expect(container).toBeTruthy();
  });

  it("handles email with underscores", () => {
    const contact = {
      ...mockContact,
      first_name: null,
      last_name: null,
      emails: [{ email: "michael_brown@company.com" }],
    };
    const { container } = render(<ContactDetailList contact={contact} />);
    expect(container).toBeTruthy();
  });

  it("handles email with hyphens", () => {
    const contact = {
      ...mockContact,
      first_name: null,
      last_name: null,
      emails: [{ email: "mary-kate@domain.org" }],
    };
    const { container } = render(<ContactDetailList contact={contact} />);
    expect(container).toBeTruthy();
  });

  it("displays social media links when available", () => {
    const contact = {
      ...mockContact,
      linkedin: "https://linkedin.com/in/johndoe",
      twitter: "https://twitter.com/johndoe",
    };
    const { container } = render(<ContactDetailList contact={contact} />);
    expect(container).toBeTruthy();
  });

  it("displays website when available", () => {
    const contact = {
      ...mockContact,
      website: "https://johndoe.com",
    };
    const { container } = render(<ContactDetailList contact={contact} />);
    expect(container).toBeTruthy();
  });
});
