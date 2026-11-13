import "./support/act-environment";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { User } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SIGNED_IN_USER, finishLatestSignIn } from "./support/sign-in";
import { GenerateCardForm } from "../src/components/GenerateCardForm";
import { AccountActionSection } from "../src/components/AccountActionSection";
import { requestCard } from "../src/lib/card-request-generate";
import { Action, navigation } from "./support/raycast";

vi.mock("@raycast/api", async () => import("./support/raycast.js"));
vi.mock("../src/lib/supabase", () => ({ supabase: {} }));
vi.mock("../src/lib/card-request-generate", () => ({ requestCard: vi.fn() }));
vi.mock("../src/lib/suggested-definitions", () => ({ suggestDefinition: vi.fn() }));
vi.mock("../src/components/AccountActionSection", () => ({ AccountActionSection: () => null }));
vi.mock("../src/components/AppsActionSection", () => ({ AppsActionSection: () => null }));
vi.mock("../src/components/SignInView", () => ({ SignInView: () => null }));
const mockedHookState = vi.hoisted(() => ({ user: null as User | null, refresh: vi.fn(), revalidate: vi.fn() }));
vi.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockedHookState.user, refresh: mockedHookState.refresh }),
}));
vi.mock("../src/hooks/useSubscriptionState", () => ({ useSubscriptionState: () => ({}) }));
vi.mock("../src/hooks/usePrivateCardQuota", () => ({
  usePrivateCardQuota: () => ({ revalidatePrivateCardQuota: mockedHookState.revalidate }),
}));

describe("Generate sign-in intent", () => {
  let renderer: ReactTestRenderer;

  async function renderForm() {
    await act(async () => {
      renderer = create(createElement(GenerateCardForm, { initialWord: "apple" }));
    });
    await editField("definition", "a fruit");
  }

  async function editField(id: string, value: string) {
    const field = renderer.root.findAll((element) => typeof element.type === "string" && element.props.id === id)[0];
    await act(async () => {
      field.props.onChange(value);
    });
  }

  async function pressSubmit() {
    await act(async () => {
      await renderer.root.findByType(Action.SubmitForm).props.onSubmit();
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockedHookState.user = null;
    mockedHookState.refresh.mockImplementation(async () => {
      mockedHookState.user = SIGNED_IN_USER;
    });
    vi.mocked(requestCard).mockReset().mockResolvedValue({ status: "queued", word: "apple" });
  });

  afterEach(async () => {
    await act(async () => renderer?.unmount());
  });

  it("submits once after completing the sign-in opened by Submit", async () => {
    await renderForm();
    await pressSubmit();
    expect(requestCard).not.toHaveBeenCalled();
    await finishLatestSignIn();
    await finishLatestSignIn();
    expect(requestCard).toHaveBeenCalledExactlyOnceWith(SIGNED_IN_USER.id, "apple", "a fruit", "private", false);
    expect(mockedHookState.revalidate).toHaveBeenCalledOnce();
  });

  it.each([
    { field: "unchanged", value: "" },
    { field: "word", value: "banana" },
    { field: "definition", value: "a technology company" },
    { field: "destination", value: "public" },
  ])("does not submit after canceling and later signing in from Account ($field)", async ({ field, value }) => {
    await renderForm();
    await pressSubmit();
    // Back discards this pushed sign-in view without calling onAuthenticated.
    navigation.pop();
    if (field !== "unchanged") await editField(field, value);
    await act(async () => {
      renderer.root.findByType(AccountActionSection).props.onSignIn();
    });
    await finishLatestSignIn();
    expect(requestCard).not.toHaveBeenCalled();
  });

  it("submits the edited form when Submit opens a new sign-in attempt", async () => {
    await renderForm();
    await pressSubmit();
    navigation.pop();
    await editField("word", "banana");
    await editField("definition", "a yellow fruit");
    await editField("destination", "public");
    await pressSubmit();
    await finishLatestSignIn();
    expect(requestCard).toHaveBeenCalledExactlyOnceWith(SIGNED_IN_USER.id, "banana", "a yellow fruit", "public", false);
  });
});
