import { updateWatchlistName } from "../services/watchlist";
import { useI18n } from "../locales";
import { FormValues } from "../types";
import { validateNonEmpty, handleError, showSuccessToast } from "../utils/error-handling";

interface UseRenameWatchlistFormProps {
  watchlistId: string;
  currentName: string;
  onSuccess?: () => void;
}

export function useRenameWatchlistForm({ watchlistId, currentName, onSuccess }: UseRenameWatchlistFormProps) {
  const { t } = useI18n();

  const handleSubmit = async (values: FormValues) => {
    const validationError = validateNonEmpty(values.name, "List name");
    if (validationError) {
      handleError(new Error(validationError), {
        title: t.watchlist.errorTitle,
        message: t.watchlist.listNameEmptyError,
        translations: t,
      });
      return;
    }

    const trimmedName = values.name.trim();
    if (trimmedName === currentName) {
      onSuccess?.();
      return;
    }

    try {
      await updateWatchlistName(watchlistId, trimmedName);
      showSuccessToast(t.portfolio.renamedTitle, t.portfolio.renamedMessage(trimmedName));
      onSuccess?.();
    } catch (error) {
      handleError(error, {
        title: t.watchlist.errorTitle,
        message: t.portfolio.renameErrorMessage,
        translations: t,
      });
    }
  };

  const submitTitle = t.portfolio.renameTitle;

  return {
    handleSubmit,
    submitTitle,
  };
}
