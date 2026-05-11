export type CategoriesViewState = {
  isShowingProgress: boolean;
  isDetailed: boolean;
};

export type CategoriesViewAction = { type: 'reset' } | { type: 'toggle'; view: 'progress' | 'details' };

export function categoryViewReducer(state: CategoriesViewState, action: CategoriesViewAction): CategoriesViewState {
  switch (action.type) {
    case 'reset': {
      return { isDetailed: false, isShowingProgress: false };
    }
    case 'toggle': {
      if (action.view === 'details') {
        return { ...state, isDetailed: !state.isDetailed };
      }

      return { ...state, isShowingProgress: !state.isShowingProgress };
    }
    default:
      //@ts-expect-error action type does not exist
      throw new Error(`Invalid action type "${action.type}" in transactionViewReducer`);
  }
}

export function initView({ isDetailed = false, isShowingProgress = false }: CategoriesViewState): CategoriesViewState {
  return {
    isDetailed,
    isShowingProgress,
  };
}
