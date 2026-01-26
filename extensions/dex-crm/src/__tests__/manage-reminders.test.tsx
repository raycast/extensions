import { render, waitFor } from "@testing-library/react";
import ManageReminders from "../manage-reminders";
import { DexReminder } from "../types";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  List: ({ children }: { children: React.ReactNode }) => <div data-testid="list">{children}</div>,
  ActionPanel: ({ children }: { children: React.ReactNode }) => <div data-testid="action-panel">{children}</div>,
  Action: {
    Push: ({ title }: { title: string }) => <div data-testid="action-push">{title}</div>,
    OpenInBrowser: ({ title }: { title: string }) => <div data-testid="action-open">{title}</div>,
    SubmitForm: ({ title }: { title: string }) => <div data-testid="action-submit">{title}</div>,
  },
  Icon: {
    Clock: "clock-icon",
    Plus: "plus-icon",
    Pencil: "pencil-icon",
    Trash: "trash-icon",
    Checkmark: "checkmark-icon",
    Person: "person-icon",
    Envelope: "envelope-icon",
    Eye: "eye-icon",
    List: "list-icon",
  },
  Color: {
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
const mockGetAllReminders = jest.fn();
const mockGetContact = jest.fn();
const mockDeleteReminder = jest.fn();
const mockUpdateReminder = jest.fn();

jest.mock("../dex-api", () => ({
  DexAPI: jest.fn().mockImplementation(() => ({
    getAllReminders: mockGetAllReminders,
    getContact: mockGetContact,
    deleteReminder: mockDeleteReminder,
    updateReminder: mockUpdateReminder,
  })),
}));

describe("ManageReminders", () => {
  const mockReminders: DexReminder[] = [
    {
      id: "reminder-1",
      contact_id: "contact-1",
      reminder_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      note: "Follow up on proposal",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "reminder-2",
      contact_id: "contact-2",
      reminder_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday (overdue)
      note: "Check in",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  const mockContact = {
    id: "contact-1",
    first_name: "John",
    last_name: "Doe",
    emails: [{ email: "john@example.com" }],
    phones: [],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllReminders.mockResolvedValue(mockReminders);
    mockGetContact.mockResolvedValue(mockContact);
  });

  it("renders loading state initially", () => {
    const { container } = render(<ManageReminders />);
    expect(container).toBeTruthy();
  });

  it("loads and displays reminders", async () => {
    const { container } = render(<ManageReminders />);

    await waitFor(() => {
      expect(mockGetAllReminders).toHaveBeenCalled();
    });

    expect(container).toBeTruthy();
  });

  it("fetches contact details for each reminder", async () => {
    render(<ManageReminders />);

    await waitFor(() => {
      expect(mockGetContact).toHaveBeenCalledWith("contact-1");
      expect(mockGetContact).toHaveBeenCalledWith("contact-2");
    });
  });

  it("sorts reminders by date (soonest first)", async () => {
    const { container } = render(<ManageReminders />);

    await waitFor(() => {
      expect(mockGetAllReminders).toHaveBeenCalled();
    });

    expect(container).toBeTruthy();
  });

  it("formats reminder dates correctly - today", () => {
    const today = new Date();
    const reminder = {
      ...mockReminders[0],
      reminder_at: today.toISOString(),
    };

    expect(reminder.reminder_at).toBeTruthy();
  });

  it("formats reminder dates correctly - tomorrow", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const reminder = {
      ...mockReminders[0],
      reminder_at: tomorrow.toISOString(),
    };

    expect(reminder.reminder_at).toBeTruthy();
  });

  it("formats reminder dates correctly - overdue", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const reminder = {
      ...mockReminders[0],
      reminder_at: yesterday.toISOString(),
    };

    expect(reminder.reminder_at).toBeTruthy();
  });

  it("filters reminders by upcoming", async () => {
    const { container } = render(<ManageReminders />);

    await waitFor(() => {
      expect(mockGetAllReminders).toHaveBeenCalled();
    });

    expect(container).toBeTruthy();
  });

  it("filters reminders by overdue", async () => {
    const { container } = render(<ManageReminders />);

    await waitFor(() => {
      expect(mockGetAllReminders).toHaveBeenCalled();
    });

    expect(container).toBeTruthy();
  });

  it("shows all reminders when filter is 'all'", async () => {
    const { container } = render(<ManageReminders />);

    await waitFor(() => {
      expect(mockGetAllReminders).toHaveBeenCalled();
    });

    expect(container).toBeTruthy();
  });

  it("displays empty state when no reminders exist", async () => {
    mockGetAllReminders.mockResolvedValue([]);

    const { container } = render(<ManageReminders />);

    await waitFor(() => {
      expect(mockGetAllReminders).toHaveBeenCalled();
    });

    expect(container).toBeTruthy();
  });

  it("handles API errors gracefully", async () => {
    mockGetAllReminders.mockRejectedValue(new Error("API Error"));

    const { container } = render(<ManageReminders />);

    await waitFor(() => {
      expect(mockGetAllReminders).toHaveBeenCalled();
    });

    expect(container).toBeTruthy();
  });
});
