import { List, getPreferenceValues, Icon } from "@raycast/api";
import { useState } from "react";
import { MaxResult } from "../../types/max";
import { Preferences } from "../../types/shared";
import { MaxItem } from "./MaxItem";

interface ListViewProps {
  searchText: string;
  setSearchText: (text: string) => void;
  results: MaxResult[];
  setWeight: (weight: string) => void;
  setReps: (reps: string) => void;
}

export const ListView: React.FC<ListViewProps> = ({ searchText, setSearchText, results, setWeight, setReps }) => {
  const [showingDetail, setShowingDetail] = useState(false);
  const { unitSystem } = getPreferenceValues<Preferences>();

  // Handle search text changes
  const handleSearchTextChange = (text: string) => {
    // Update searchText
    setSearchText(text);

    // Try to parse weight and reps - use a stricter pattern that matches the UI example
    const match = text.match(/^(\d*(\.\d*)?)[x]?(\d*)?$/);

    if (match) {
      // Set weight if available
      const parsedWeight = match[1] || "";
      setWeight(parsedWeight);

      // Set reps if available
      const parsedReps = match[3] || "";
      setReps(parsedReps);
    }
  };

  // Determine what should be rendered
  const renderContent = () => {
    // No search text
    if (!searchText) {
      return (
        <List.EmptyView
          title="Enter your values"
          description="Your input should match the format weight x repetitions (e.g. 70x6)"
          icon={Icon.ExclamationMark}
        />
      );
    }

    // Check for a complete weight x reps pattern - use only 'x' to match UI example
    const completeMatch = searchText.match(/^(\d+(\.\d+)?)[x](\d+)$/);

    // Show EmptyView if no complete match
    if (!completeMatch) {
      return (
        <List.EmptyView
          title="Complete your input"
          description="Enter both weight and repetitions (e.g. 70x6)"
          icon={Icon.ExclamationMark}
        />
      );
    }

    // Check if results contain an error result
    if (results.length === 1 && results[0].label === "Invalid input format") {
      return (
        <List.EmptyView
          title="Calculation Error"
          description={results[0].text || "Unable to calculate one-rep max"}
          icon={Icon.ExclamationMark}
        />
      );
    }

    // Has valid results
    return results.map((result, index) => (
      <MaxItem
        key={index}
        result={result}
        unitSystem={unitSystem}
        results={results}
        setShowingDetail={setShowingDetail}
      />
    ));
  };

  // Determine if we're in a loading state - true when we have a valid format and are calculating
  const hasValidFormat = searchText.match(/^(\d+(\.\d+)?)[x](\d+)$/) !== null;
  const isCalculating = hasValidFormat && results.length > 0;

  return (
    <List
      searchBarPlaceholder="Enter weight x repetitions (e.g. 70x6)"
      onSearchTextChange={handleSearchTextChange}
      searchText={searchText}
      isShowingDetail={showingDetail}
      isLoading={isCalculating}
    >
      {renderContent()}
    </List>
  );
};
