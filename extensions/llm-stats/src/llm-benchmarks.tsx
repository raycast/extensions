import { Icon, List, showToast, Toast, Color, ActionPanel } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { ZeroEvalAPI } from "./utils/zeroeval-api";
import { getOrganizationLogo } from "./utils/organization-logos";
import { useModels } from "./utils/use-models";
import {
  ShowDetailsAction,
  ModelDetailsLinkAction,
  OpenPlaygroundAction,
  CompareWithSubmenu,
} from "./components/actions/ModelActions";
import { getCategoryIcon } from "./utils/category-icons";

const api = new ZeroEvalAPI();

export default function Command() {
  const [selectedCategoryId, setSelectedCategoryId] = useCachedState<string>("selected-category-id", "general");

  // Load and cache all models
  const { data: allModels, isLoading: isLoadingModels } = useModels(true, true);

  // Load categories
  const {
    data: categories,
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useCachedPromise(async () => api.getCategories(), [], {
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load categories",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  // Load benchmarks for selected category
  const {
    data: categoryData,
    isLoading: isLoadingBenchmarks,
    error: benchmarksError,
  } = useCachedPromise(
    async (categoryId: string | undefined) => {
      if (!categoryId) return null;

      try {
        return await api.getCategoryBenchmarks(categoryId);
      } catch (error) {
        console.error(`Failed to load benchmarks for category ${categoryId}:`, error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load benchmarks",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      }
    },
    [selectedCategoryId],
    {
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load benchmarks",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      },
    },
  );

  // Auto-select first category if none selected and categories are loaded
  useEffect(() => {
    if (categories && categories.length > 0 && !selectedCategoryId) {
      const firstCategory = categories.find((c) => c.category_id === "general") || categories[0];
      if (firstCategory) {
        setSelectedCategoryId(firstCategory.category_id);
      }
    }
  }, [categories, selectedCategoryId, setSelectedCategoryId]);

  const isLoading = isLoadingCategories || isLoadingBenchmarks || isLoadingModels;
  const error = categoriesError || benchmarksError;

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error loading data"
          description={error instanceof Error ? error.message : "Unknown error occurred"}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search models..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          value={selectedCategoryId}
          onChange={(newValue) => setSelectedCategoryId(newValue)}
        >
          {categories
            ?.sort((a, b) => a.name.localeCompare(b.name))
            .map((category) => (
              <List.Dropdown.Item
                key={category.category_id}
                title={category.name}
                value={category.category_id}
                icon={getCategoryIcon(category.category_id)}
              />
            ))}
        </List.Dropdown>
      }
    >
      {!selectedCategoryId ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Select a category"
          description="Choose a category from the dropdown to view benchmarks"
        />
      ) : categoryData && categoryData.benchmarks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No models found"
          description="No models available for benchmarks in this category"
        />
      ) : (
        categoryData?.benchmarks.map((benchmark) => (
          <List.Section key={benchmark.benchmark_id} title={benchmark.name}>
            {benchmark.top_models.slice(0, 5).map((model, index) => {
              const cachedModel = allModels?.find((m) => m.model_id === model.model_id);
              // Add Trophy icon to first element in each section
              const accessories: List.Item.Accessory[] = [
                index === 0
                  ? {
                      tag: {
                        value: formatBenchmarkScore(model.benchmark_score, benchmark.max_score),
                        color: Color.Yellow,
                      },
                      icon: Icon.Trophy,
                      tooltip: benchmark.description || benchmark.name,
                    }
                  : {
                      text: formatBenchmarkScore(model.benchmark_score, benchmark.max_score),
                      tooltip: benchmark.description || benchmark.name,
                    },
              ];

              return (
                <List.Item
                  key={`${benchmark.benchmark_id}-${model.model_id}`}
                  icon={getOrganizationLogo(cachedModel?.organization_id || model.organization_name.toLowerCase())}
                  title={cachedModel?.name || model.model_name}
                  subtitle={cachedModel?.organization || model.organization_name}
                  keywords={
                    [
                      model.model_id,
                      model.organization_name,
                      cachedModel?.organization_id,
                      benchmark.name,
                      benchmark.benchmark_id,
                    ].filter(Boolean) as string[]
                  }
                  accessories={accessories}
                  actions={
                    <ActionPanel>
                      <ShowDetailsAction modelId={model.model_id} />
                      <ModelDetailsLinkAction modelId={model.model_id} />
                      <OpenPlaygroundAction modelId={model.model_id} />
                      <CompareWithSubmenu modelId={model.model_id} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
}

/**
 * Formats benchmark score based on max_score
 * @param score - The benchmark score
 * @param maxScore - Maximum possible score for the benchmark
 * @returns Formatted score string
 */
function formatBenchmarkScore(score: number, maxScore: number): string {
  if (maxScore === 1) {
    // Percentage format for max_score = 1
    return `${(score * 100).toFixed(2)}%`;
  }
  // Integer format for larger values
  return score.toFixed(2);
}
