import React from "react";
import { render, screen, waitFor, act, within } from "@testing-library/react";
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
    render(<CustomRules rules={mockRules} isLoading={false} onRuleChange={() => {}} />);

    expect(screen.getByText("||example.com^")).toBeInTheDocument();
    expect(screen.getByText("Domain")).toBeInTheDocument();

    expect(screen.getByText("@@allowlist.com")).toBeInTheDocument();
    expect(screen.getByText("Allowlist")).toBeInTheDocument();

    expect(screen.getByText("127.0.0.1 blocked.com")).toBeInTheDocument();
    expect(screen.getByText("Hosts Block")).toBeInTheDocument();
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
    const onRuleChange = jest.fn();
    render(<CustomRules rules={mockRules} isLoading={false} onRuleChange={onRuleChange} />);

    await act(async () => {
      const firstListItem = screen.getAllByTestId("list-item")[0];
      const addButton = within(firstListItem).getByRole("button", { name: /add rule/i });
      await userEvent.click(addButton);
    });

    await act(async () => {
      await userEvent.type(screen.getByRole("textbox"), "example.com");
      const form = screen.getByTestId("form");
      const submitButton = within(form).getByRole("button", { name: "Add Rule" });
      await userEvent.click(submitButton);
    });

    expect(addCustomRule).toHaveBeenCalledWith("example.com");
    expect(onRuleChange).toHaveBeenCalled();
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
