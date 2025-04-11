import { List, getPreferenceValues, Icon } from "@raycast/api";
import { useState } from "react";
import { VolumeResult } from "../../types/volume";
import { Preferences } from "../../types/shared";
import { VolumeItem } from "./VolumeItem";

interface ListViewProps {
  weight: string;
  setWeight: (weight: string) => void;
  results: VolumeResult[];
}

export const ListView: React.FC<ListViewProps> = ({ weight, setWeight, results }) => {
  const [showingDetail, setShowingDetail] = useState(false);
  const { unitSystem } = getPreferenceValues<Preferences>();

  // Handle search text changes
  const handleSearchTextChange = (text: string) => {
    setWeight(text);
  };

  // Determine what should be rendered
  const renderContent = () => {
    // No weight entered
    if (!weight) {
      return (
        <List.EmptyView
          title="Enter your one rep max"
          description="Enter your one rep max weight (e.g. 225)"
          icon={Icon.ExclamationMark}
        />
      );
    }

    // Check if no results (indicating an error)
    if (results.length === 0) {
      return (
        <List.EmptyView
          title="Invalid Input"
          description="Please enter a valid weight between the allowed range"
          icon={Icon.ExclamationMark}
        />
      );
    }

    // Has valid results
    return results.map((result, index) => (
      <VolumeItem
        key={index}
        result={result}
        results={results}
        unitSystem={unitSystem}
        setShowingDetail={setShowingDetail}
      />
    ));
  };

  return (
    <List
      searchBarPlaceholder="Enter one rep max weight"
      onSearchTextChange={handleSearchTextChange}
      searchText={weight}
      isShowingDetail={showingDetail}
      isLoading={weight !== "" && results.length === 0}
    >
      {renderContent()}
    </List>
  );
};
