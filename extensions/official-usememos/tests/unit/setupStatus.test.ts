import { describe, expect, it } from "vitest";
import { describeSetup } from "../../src/components/setupStatus";

const base = { instanceUrl: "https://demo.usememos.com", isLoading: false, isTokenRejected: false };
const user = { name: "users/1", username: "steven", displayName: "Steven" };

describe("describeSetup", () => {
  it("reports progress while checking", () => {
    expect(describeSetup({ ...base, isLoading: true }).connection).toEqual({
      title: "Checking connection…",
      tone: "pending",
    });
  });

  it("greets the signed-in user and accepts the token", () => {
    const setup = describeSetup({ ...base, user });
    expect(setup.connection).toEqual({ title: "Connected as Steven", subtitle: "@steven", tone: "success" });
    expect(setup.token).toEqual({ tag: "Accepted", tone: "success" });
  });

  it("marks the token rejected on 401/403", () => {
    const setup = describeSetup({ ...base, errorMessage: "rejected", isTokenRejected: true });
    expect(setup.connection).toEqual({ title: "Couldn't connect", subtitle: "rejected", tone: "failure" });
    expect(setup.token).toEqual({ tag: "Rejected", tone: "failure" });
  });

  it("leaves the token unverified when the instance itself failed", () => {
    expect(describeSetup({ ...base, errorMessage: "unreachable" }).token).toEqual({
      tag: "Not verified",
      tone: "neutral",
    });
  });

  it("labels the public demo instance", () => {
    expect(describeSetup(base).instance.tag).toBe("Demo");
    expect(describeSetup({ ...base, instanceUrl: "https://memos.example.com" }).instance.tag).toBeUndefined();
  });
});
