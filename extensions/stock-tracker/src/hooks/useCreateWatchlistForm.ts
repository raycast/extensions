import { createWatchlist, addStockToWatchlist } from "../services/watchlist";
import { useI18n } from "../locales";
import { StockItem, CreateWatchlistMode, FormValues } from "../types";
import { validateNonEmpty, handleError, showSuccessToast } from "../utils/error-handling";

interface UseCreateWatchlistFormProps {
  onSuccess?: () => void;
  stockToAdd?: StockItem;
  mode?: CreateWatchlistMode;
}

export function useCreateWatchlistForm({ onSuccess, stockToAdd, mode = "create" }: UseCreateWatchlistFormProps) {
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

    try {
      const trimmedName = values.name.trim();
      const newWatchlist = await createWatchlist(trimmedName);

      if (mode === "createAndAdd" && stockToAdd) {
        await addStockToWatchlist(newWatchlist.id, stockToAdd);
        showSuccessToast(t.watchlist.addedTitle, t.watchlist.createdMessage(stockToAdd.name ?? stockToAdd.symbol));
      } else {
        showSuccessToast(t.portfolio.createdTitle, t.portfolio.createdMessage(trimmedName));
      }

      onSuccess?.();
    } catch (error) {
      handleError(error, {
        title: mode === "createAndAdd" ? t.watchlist.createErrorTitle : t.watchlist.errorTitle,
        message: mode === "createAndAdd" ? t.watchlist.createErrorMessage : t.portfolio.createErrorMessage,
        translations: t,
      });
    }
  };

  const submitTitle = mode === "createAndAdd" ? t.watchlist.createAndAddTitle : t.portfolio.createTitle;

  return {
    handleSubmit,
    submitTitle,
  };
}
