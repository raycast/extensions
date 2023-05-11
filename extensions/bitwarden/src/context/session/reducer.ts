import { useReducer } from "react";
import { SessionState } from "~/types/session";

const initialState: SessionState = {
  token: undefined,
  isLoading: true,
  isLocked: false,
  isAuthenticated: false,
  passwordHash: undefined,
  lastActivityTime: undefined,
  lockReason: undefined,
};

type SessionReducerActions =
  | { type: "lock"; lockReason?: string }
  | { type: "unlock"; token: string; passwordHash: string }
  | { type: "logout" }
  | { type: "vaultTimeout" }
  | {
      type: "loadSavedState";
      token?: string;
      passwordHash?: string;
      lastActivityTime?: Date;
      shouldLockVault?: boolean;
      lockReason?: string;
    }
  | { type: "failedLoadSavedState" };

export const useSessionReducer = () => {
  return useReducer((state: SessionState, action: SessionReducerActions): SessionState => {
    switch (action.type) {
      case "lock": {
        return {
          ...state,
          token: undefined,
          passwordHash: undefined,
          isLoading: false,
          isLocked: true,
          lockReason: action.lockReason,
        };
      }
      case "unlock": {
        return {
          ...state,
          token: action.token,
          passwordHash: action.passwordHash,
          isLocked: false,
          isAuthenticated: true,
          lockReason: undefined,
        };
      }
      case "logout": {
        return { ...state, token: undefined, passwordHash: undefined, isAuthenticated: false };
      }
      case "vaultTimeout": {
        return { ...state, isLocked: true };
      }
      case "loadSavedState": {
        const hasToken = !!action.token;
        return {
          ...state,
          token: action.token,
          passwordHash: action.passwordHash,
          lastActivityTime: action.lastActivityTime,
          isLoading: false,
          isLocked: action.shouldLockVault || !hasToken,
          isAuthenticated: hasToken,
          lockReason: action.lockReason,
        };
      }
      case "failedLoadSavedState": {
        return { ...state, isLoading: false, isLocked: true };
      }
      default:
        return state;
    }
  }, initialState);
};
