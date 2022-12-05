import { Loading, MappedExpression } from "../types";

export interface ZipCodesListState {
  loading: Loading;
  zipCodes: MappedExpression[] | null;
  search: string;
  loadingFailed: boolean;
}

export enum ActionType {
  SetZipCodes,
  StartCountriesLoading,
  LoadingFailed,
  Search,
  ToggleLoading,
  Loaded,
}

export type ZipCodeListAction =
  | { type: ActionType.SetZipCodes; payload: MappedExpression[] }
  | { type: ActionType.StartCountriesLoading }
  | { type: ActionType.LoadingFailed }
  | { type: ActionType.Search; payload: string }
  | { type: ActionType.ToggleLoading }
  | { type: ActionType.Loaded };

export function zipCodesListReducer(state: ZipCodesListState, action: ZipCodeListAction): ZipCodesListState {
  switch (action.type) {
    case ActionType.SetZipCodes:
      return {
        ...state,
        zipCodes: action.payload,
      };
    case ActionType.StartCountriesLoading:
      return {
        ...state,
        loading: Loading.LOADING,
      };
    case ActionType.Search:
      return {
        ...state,
        search: action.payload,
      };
    case ActionType.Loaded:
      return {
        ...state,
        loading: Loading.LOADED,
      };
    default: {
      return state;
    }
  }
}
