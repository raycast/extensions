import { useReducer } from "react";
import { PhotoItem, SessionState, SessionAction } from "../types";

const initialState: SessionState = {
  photos: [],
  currentIndex: 0,
  actions: [],
  kept: 0,
  trashed: 0,
  skipped: 0,
  spaceFreed: 0,
  isComplete: false,
};

function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case "init":
      return { ...initialState, photos: action.photos };

    case "keep": {
      const photo = state.photos[state.currentIndex];
      const nextIndex = state.currentIndex + 1;
      return {
        ...state,
        currentIndex: nextIndex,
        kept: state.kept + 1,
        actions: [...state.actions, { kind: "keep", photo }],
        isComplete: nextIndex >= state.photos.length,
      };
    }

    case "trash": {
      const photo = state.photos[state.currentIndex];
      const nextIndex = state.currentIndex + 1;
      return {
        ...state,
        currentIndex: nextIndex,
        trashed: state.trashed + 1,
        spaceFreed: state.spaceFreed + photo.size,
        actions: [
          ...state.actions,
          { kind: "trash", photo, pendingTrashPath: action.pendingTrashPath },
        ],
        isComplete: nextIndex >= state.photos.length,
      };
    }

    case "skip": {
      const photo = state.photos[state.currentIndex];
      const nextIndex = state.currentIndex + 1;
      return {
        ...state,
        currentIndex: nextIndex,
        skipped: state.skipped + 1,
        actions: [...state.actions, { kind: "skip", photo }],
        isComplete: nextIndex >= state.photos.length,
      };
    }

    case "undo": {
      if (state.actions.length === 0) return state;
      const lastAction = state.actions[state.actions.length - 1];
      return {
        ...state,
        currentIndex: state.currentIndex - 1,
        kept: state.kept - (lastAction.kind === "keep" ? 1 : 0),
        trashed: state.trashed - (lastAction.kind === "trash" ? 1 : 0),
        skipped: state.skipped - (lastAction.kind === "skip" ? 1 : 0),
        spaceFreed:
          state.spaceFreed -
          (lastAction.kind === "trash" ? lastAction.photo.size : 0),
        actions: state.actions.slice(0, -1),
        isComplete: false,
      };
    }

    default:
      return state;
  }
}

export function useSessionState(photos: PhotoItem[]) {
  return useReducer(sessionReducer, { ...initialState, photos });
}
