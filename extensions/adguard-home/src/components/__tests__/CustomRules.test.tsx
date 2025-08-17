import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomRules } from "../CustomRules";
import { addCustomRule, removeCustomRule } from "../../api";
import { Toast, showToast } from "@raycast/api";
import { act } from "react";

// Mock the API functions
jest.mock("../../api", () => ({
  addCustomRule: jest.fn(),
  removeCustomRule: jest.fn(),
}));

describe("CustomRules", () => {
  const setup = async () => {
    const user = userEvent.setup();
    return { user };
  };

  const mockRules = [
    { enabled: true, text: "||example.com^" },
    { enabled: false, text: "@@allowlist.com" },
    { enabled: true, text: "127.0.0.1 blocked.com" },
  ];

  const mockOnRuleChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders rules with correct types", () => {
    render(<CustomRules rules={mockRules} isLoading={false} onRuleChange={() => {}} />);

    expect(screen.getAllByText("||example.com^")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Domain")[0]).toBeInTheDocument();

    expect(screen.getAllByText("@@allowlist.com")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Allowlist")[0]).toBeInTheDocument();

    expect(screen.getAllByText("127.0.0.1 blocked.com")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Hosts Block")[0]).toBeInTheDocument();
  });

  it("handles rule removal", async () => {
    const onRuleChange = jest.fn();
    render(<CustomRules rules={mockRules} isLoading={false} onRuleChange={onRuleChange} />);

    await act(async () => {
      const firstListItem = screen.getAllByTestId("list-item")[0];
      const removeButton = within(firstListItem).getByRole("button", { name: /remove/i });
      await userEvent.click(removeButton);
    });

    expect(removeCustomRule).toHaveBeenCalled();
    expect(onRuleChange).toHaveBeenCalled();
  });

  it("handles rule addition", async () => {
    const { user } = await setup();
    (addCustomRule as jest.Mock).mockResolvedValueOnce(undefined);

    render(<CustomRules rules={mockRules} isLoading={false} onRuleChange={mockOnRuleChange} />);

    // Open add form
    const addButton = screen.getAllByTitle("Add Rule")[0];
    await act(async () => {
      await user.click(addButton);
    });

    // Fill and submit form
    const input = screen.getByPlaceholderText("Enter filtering rule (e.g., ||example.com^)");
    await act(async () => {
      await user.type(input, "||newdomain.com^");
    });

    // Find the submit button within the form
    const form = screen.getByTestId("form");
    const submitButton = within(form).getByRole("button", { name: "Add Rule" });
    await act(async () => {
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(addCustomRule).toHaveBeenCalledWith("||newdomain.com^");
      expect(mockOnRuleChange).toHaveBeenCalled();
    });
  });

  it("shows loading state", () => {
    render(<CustomRules rules={[]} isLoading={true} onRuleChange={mockOnRuleChange} />);

    expect(screen.getAllByRole("list")[0]).toHaveAttribute("aria-busy", "true");
  });

  it("handles API errors gracefully", async () => {
    const { user } = await setup();
    const error = new Error("API Error");
    (removeCustomRule as jest.Mock).mockRejectedValueOnce(error);

    render(<CustomRules rules={mockRules} isLoading={false} onRuleChange={mockOnRuleChange} />);

    const removeButtons = screen.getAllByTitle("Remove Rule");
    await user.click(removeButtons[0]);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Failure,
          title: "Failed to remove rule",
        })
      );
    });
  });
});
