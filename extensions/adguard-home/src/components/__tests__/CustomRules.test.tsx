import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomRules } from "../CustomRules";
import { addCustomRule, removeCustomRule } from "../../api";
import { Toast, showToast } from "@raycast/api";

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
    render(<CustomRules rules={mockRules} isLoading={false} onRuleChange={mockOnRuleChange} />);

    expect(screen.getByText("||example.com^")).toBeInTheDocument();
    expect(screen.getByText("Domain")).toBeInTheDocument();

    expect(screen.getByText("@@allowlist.com")).toBeInTheDocument();
    expect(screen.getByText("Allowlist")).toBeInTheDocument();

    expect(screen.getByText("127.0.0.1 blocked.com")).toBeInTheDocument();
    expect(screen.getByText("Hosts Block")).toBeInTheDocument();
  });

  it("handles rule removal", async () => {
    const { user } = await setup();
    (removeCustomRule as jest.Mock).mockResolvedValueOnce(undefined);

    render(<CustomRules rules={mockRules} isLoading={false} onRuleChange={mockOnRuleChange} />);

    const removeButtons = screen.getAllByTitle("Remove Rule");
    await user.click(removeButtons[0]);

    await waitFor(() => {
      expect(removeCustomRule).toHaveBeenCalledWith("||example.com^");
      expect(mockOnRuleChange).toHaveBeenCalled();
    });
  });

  it("handles rule addition", async () => {
    const { user } = await setup();
    (addCustomRule as jest.Mock).mockResolvedValueOnce(undefined);

    render(<CustomRules rules={mockRules} isLoading={false} onRuleChange={mockOnRuleChange} />);

    // Open add form
    const addButtons = screen.getAllByTitle("Add Rule");
    await user.click(addButtons[0]);

    // Fill and submit form
    const input = screen.getByPlaceholderText("Enter filtering rule (e.g., ||example.com^)");
    await user.type(input, "||newdomain.com^");

    const form = screen.getByTestId("form");
    const submitButton = within(form).getByRole("button", { name: "Add Rule" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(addCustomRule).toHaveBeenCalledWith("||newdomain.com^");
      expect(mockOnRuleChange).toHaveBeenCalled();
    });
  });

  it("shows loading state", () => {
    render(<CustomRules rules={[]} isLoading={true} onRuleChange={mockOnRuleChange} />);

    expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true");
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
