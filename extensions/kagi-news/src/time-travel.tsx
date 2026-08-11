// time-travel.tsx
// Time Travel command - browse Kagi News archives by selecting a specific date

import { List, Action, ActionPanel, Icon, getPreferenceValues, Form } from "@raycast/api";
import { useState } from "react";
import { useCategoryFeed } from "./hooks/useCategoryFeed";
import { useFetch, useCachedState } from "@raycast/utils";
import { useBatchesByDate } from "./hooks/useBatchesByDate";
import type { BatchItem } from "./interfaces";
import { ArticleDetail } from "./views/ArticleDetail";
import { EventDetail } from "./views/EventDetail";
import { ChaosIndexDetail } from "./views/ChaosIndexDetail";
import { stripHtml, formatDateForAPI } from "./utils";
import { CategoryItem } from "./interfaces";

interface BatchCategoryResponse {
  id: string;
  categoryName: string;
}

interface BatchCategoriesData {
  categories: BatchCategoryResponse[];
  hasOnThisDay?: boolean;
  hasChaosIndex?: boolean;
}

// Date Picker Component
function DatePickerScreen({ onDateSelected }: { onDateSelected: (date: string) => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const minDate = new Date("2025-07-08");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: { dateInput: Date }) => {
              const selectedDateObj = values.dateInput as Date;
              if (selectedDateObj) {
                onDateSelected(formatDateForAPI(selectedDateObj));
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="dateInput"
        title="Select Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={yesterday}
        max={today}
        min={minDate}
      />
      <Form.Description text="Select a past date to browse the news archives, which begin on July 9, 2025." />
    </Form>
  );
}

// Batch Selector Component
function BatchSelectorScreen({
  confirmedDate,
  onBatchSelected,
  onBackToDate,
}: {
  confirmedDate: string;
  onBatchSelected: (batchId: string) => void;
  onBackToDate: () => void;
}) {
  const preferences = getPreferenceValues<Preferences>();
  const {
    batches,
    isLoading: loadingBatches,
    error: batchesError,
  } = useBatchesByDate(confirmedDate, preferences.language || "en");

  return (
    <List isLoading={loadingBatches}>
      {batchesError ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to Load Batches" description={batchesError} />
      ) : batches.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Batches Found"
          description={`No news batches found for ${confirmedDate}`}
          actions={
            <ActionPanel>
              <Action title="Pick Another Date" onAction={onBackToDate} icon={Icon.Calendar} />
            </ActionPanel>
          }
        />
      ) : (
        batches.map((batch: BatchItem) => (
          <List.Item
            key={batch.id}
            title={`${batch.totalClusters} clusters • ${batch.totalArticles} articles`}
            subtitle={new Date(batch.createdAt).toLocaleString()}
            actions={
              <ActionPanel>
                <Action title="Select Batch" onAction={() => onBatchSelected(batch.id)} icon={Icon.CheckCircle} />
                <Action title="Pick Another Date" onAction={onBackToDate} icon={Icon.Calendar} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// Article List Component
function ArticleListScreen({ selectedBatch, onBackToBatches }: { selectedBatch: string; onBackToBatches: () => void }) {
  const preferences = getPreferenceValues<Preferences>();
  const [selectedCategory, setSelectedCategory] = useCachedState<string>("time-travel-selected-category", "");

  const { data: categoriesData, isLoading: loadingCategories } = useFetch<BatchCategoriesData>(
    selectedBatch
      ? `https://kite.kagi.com/api/batches/${selectedBatch}/categories?lang=${preferences.language || "en"}`
      : "",
    {
      parseResponse: async (response): Promise<BatchCategoriesData> => {
        if (!response.ok) throw new Error("Failed to load categories");
        return response.json() as Promise<BatchCategoriesData>;
      },
      onData: (data) => {
        const worldCategory = data?.categories?.find(
          (cat: BatchCategoryResponse) => cat.categoryName.toLowerCase() === "world",
        );
        if (worldCategory) {
          setSelectedCategory(worldCategory.id);
        }
      },
      execute: !!selectedBatch,
    },
  );

  const categories: CategoryItem[] =
    categoriesData?.categories?.map((cat: BatchCategoryResponse) => ({
      id: cat.id,
      name: cat.categoryName,
    })) || [];

  if (categoriesData?.hasOnThisDay) {
    categories.push({
      id: "onthisday",
      name: "Today in History",
    });
  }

  categories.push({
    id: "chaos",
    name: "Chaos Index",
  });

  const sortedCategories = categories.sort((a, b) => a.name.localeCompare(b.name));

  const {
    articles,
    events,
    chaosIndex,
    isLoading: loadingContent,
    error: contentError,
    isOnThisDay,
    isChaosIndex,
  } = useCategoryFeed(selectedCategory, preferences.language || "en", selectedBatch);

  return (
    <List
      isLoading={loadingCategories || loadingContent}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          value={selectedCategory}
          onChange={(newValue) => setSelectedCategory(newValue)}
        >
          {sortedCategories.map((category) => (
            <List.Dropdown.Item key={category.id} title={category.name} value={category.id} />
          ))}
        </List.Dropdown>
      }
    >
      {contentError ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Content"
          description={contentError}
          actions={
            <ActionPanel>
              <Action title="Back to Batches" onAction={onBackToBatches} icon={Icon.ChevronLeft} />
            </ActionPanel>
          }
        />
      ) : isChaosIndex ? (
        chaosIndex ? (
          <List.Item
            key="chaos-index"
            icon="🌍"
            title="Global Chaos Index"
            subtitle={`Score: ${chaosIndex.score}/100`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={<ChaosIndexDetail score={chaosIndex.score} description={chaosIndex.description} />}
                />
              </ActionPanel>
            }
          />
        ) : (
          <List.EmptyView icon={Icon.ExclamationMark} title="No Chaos Index Data" />
        )
      ) : isOnThisDay ? (
        events.length === 0 && !loadingContent ? (
          <List.EmptyView icon={Icon.Calendar} title="No Events Found" />
        ) : (
          <>
            <List.Section title="Events">
              {events
                .filter((e) => e.type === "event")
                .map((event, idx) => (
                  <List.Item
                    key={idx}
                    icon="📅"
                    title={`${event.year} - ${stripHtml(event.content).substring(0, 80)}...`}
                    actions={
                      <ActionPanel>
                        <Action.Push title="View Event" icon={Icon.Eye} target={<EventDetail event={event} />} />
                      </ActionPanel>
                    }
                  />
                ))}
            </List.Section>
            <List.Section title="People">
              {events
                .filter((e) => e.type === "people")
                .map((event, idx) => (
                  <List.Item
                    key={idx}
                    icon="👤"
                    title={`${event.year} - ${stripHtml(event.content).substring(0, 80)}...`}
                    actions={
                      <ActionPanel>
                        <Action.Push title="View Event" icon={Icon.Eye} target={<EventDetail event={event} />} />
                      </ActionPanel>
                    }
                  />
                ))}
            </List.Section>
          </>
        )
      ) : articles.length === 0 && !loadingContent ? (
        <List.EmptyView icon={Icon.Document} title="No Articles Found" />
      ) : (
        articles.map((article) => (
          <List.Item
            key={article.id}
            icon={article.emoji || "📰"}
            title={article.title}
            accessories={[{ tag: article.category }]}
            actions={
              <ActionPanel>
                <Action.Push title="View Article" icon={Icon.Eye} target={<ArticleDetail article={article} />} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// Main Command
export default function Command() {
  const [screen, setScreen] = useState<"date" | "batch" | "articles">("date");
  const [confirmedDate, setConfirmedDate] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");

  const handleDateSelected = (date: string) => {
    setConfirmedDate(date);
    setScreen("batch");
  };

  const handleBatchSelected = (batchId: string) => {
    setSelectedBatch(batchId);
    setScreen("articles");
  };

  const handleBackToDate = () => {
    setConfirmedDate("");
    setSelectedBatch("");
    setScreen("date");
  };

  const handleBackToBatches = () => {
    setSelectedBatch("");
    setScreen("batch");
  };

  switch (screen) {
    case "date":
      return <DatePickerScreen onDateSelected={handleDateSelected} />;
    case "batch":
      return (
        <BatchSelectorScreen
          confirmedDate={confirmedDate}
          onBatchSelected={handleBatchSelected}
          onBackToDate={handleBackToDate}
        />
      );
    case "articles":
      return <ArticleListScreen selectedBatch={selectedBatch} onBackToBatches={handleBackToBatches} />;
  }
}
