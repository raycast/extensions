import { useReducer } from "react";
import { SessionState } from "~/types/session";

const initialState: SessionState = {
  token: undefined,
  passwordHash: undefined,

  isLoading: true,
  isLocked: false,
  isAuthenticated: false,
};

type SessionReducerActions =
  | ({ type: "loadState" } & Partial<Omit<SessionState, "isLoading" | "isLocked" | "isAuthenticated">>)
  | { type: "lock" }
  | ({ type: "unlock" } & Pick<SessionState, "token" | "passwordHash">)
  | { type: "logout" }
  | { type: "vaultTimeout" }
  | { type: "finishLoadingSavedState" }
  | { type: "failLoadingSavedState" };

export const useSessionReducer = () => {
  return useReducer((state: SessionState, action: SessionReducerActions): SessionState => {
    switch (action.type) {
      case "loadState": {
        const { type: _, ...actionPayload } = action;
        return { ...state, ...actionPayload };
      }
      case "lock": {
        return {
          ...state,
          token: undefined,
          passwordHash: undefined,
          isLoading: false,
          isLocked: true,
        };
      }
      case "unlock": {
        return {
          ...state,
          token: action.token,
          passwordHash: action.passwordHash,
          isLocked: false,
          isAuthenticated: true,
        };
      }
      case "logout": {
        return {
          ...state,
          token: undefined,
          passwordHash: undefined,
          isLocked: true,
          isAuthenticated: false,
          isLoading: false,
        };
      }
      case "vaultTimeout": {
        return {
          ...state,
          isLocked: true,
        };
      }
      case "finishLoadingSavedState": {
        if (!state.token || !state.passwordHash) {
          throw new Error("Missing required fields: token, passwordHash");
        }

        const hasToken = !!state.token;
        return {
          ...state,
          isLoading: false,
          isLocked: !hasToken,
          isAuthenticated: hasToken,
        };
      }
      case "failLoadingSavedState": {
        return {
          ...state,
          isLoading: false,
          isLocked: true,
        };
      }
      default: {
        return state;
      }
    }
  }, initialState);
};
