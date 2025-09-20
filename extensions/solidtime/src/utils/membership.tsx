import { useCachedState } from "@raycast/utils";
import { createContext, useContext, type ReactNode } from "react";
import type { MyMembership } from "../api/index.js";

type MembershipContext = {
  membership: MyMembership | null;
  setMembership: (membership: MyMembership) => void;
};

function defaultValue(): MembershipContext {
  return { membership: null, setMembership: () => {} };
}

const MembershipContext = createContext(defaultValue());

export function MembershipContextProvider(props: { children?: ReactNode }) {
  const [membership, setMembership] = useCachedState<MembershipContext["membership"]>("membership", null, {
    cacheNamespace: "solidtime",
  });
  return (
    <MembershipContext.Provider value={{ membership, setMembership }}>{props.children}</MembershipContext.Provider>
  );
}

export function useMembership() {
  return useContext(MembershipContext);
}

export function useOrgId() {
  const ctx = useMembership();
  return ctx.membership?.organization.id ?? null;
}
