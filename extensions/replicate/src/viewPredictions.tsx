import { usePredictions } from "./hooks/usePredictions";
import { PredictionList } from "./views/PredictionList";

export default function ViewPredictions() {
  const { data: predictions, isLoading, error, pagination, revalidate } = usePredictions();

  return (
    <PredictionList
      predictions={predictions}
      isLoading={isLoading}
      error={error}
      pagination={pagination}
      revalidate={revalidate}
    />
  );
}
