import type { Term } from "../utils/types";

export type CommandState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "ready"; terms: readonly Term[] }>
  | Readonly<{ status: "error"; message: string }>;

export type GlossaryReducerState = Readonly<{
  query: string;
  state: CommandState;
}>;

export type GlossaryAction =
  | Readonly<{ message: string; type: "loadFailed" }>
  | Readonly<{ type: "loadStarted" }>
  | Readonly<{ terms: readonly Term[]; type: "loadSucceeded" }>
  | Readonly<{ query: string; type: "queryChanged" }>;

export const glossaryReducer = (state: GlossaryReducerState, action: GlossaryAction): GlossaryReducerState => {
  switch (action.type) {
    case "loadFailed": {
      return { query: state.query, state: { message: action.message, status: "error" } };
    }
    case "loadStarted": {
      return { query: state.query, state: { status: "loading" } };
    }
    case "loadSucceeded": {
      return { query: state.query, state: { status: "ready", terms: action.terms } };
    }
    case "queryChanged": {
      return { query: action.query, state: state.state };
    }
  }
};
