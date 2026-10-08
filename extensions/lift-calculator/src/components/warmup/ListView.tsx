import { List, getPreferenceValues, Icon } from "@raycast/api";
import { useState } from "react";
import { WarmupSet } from "../../types/warmup";
import { Preferences } from "../../types/shared";
import { WarmupItem } from "./WarmupItem";

interface ListViewProps {
  weight: string;
  setWeight: (weight: string) => void;
  sets: WarmupSet[];
}

export const ListView: React.FC<ListViewProps> = ({ weight, setWeight, sets }) => {
  const [showingDetail, setShowingDetail] = useState(false);
  const { unitSystem } = getPreferenceValues<Preferences>();

  // Handle search text changes
  const handleSearchTextChange = (text: string) => {
    // Set weight directly
    setWeight(text);
  };

  // Determine what should be rendered
  const renderContent = () => {
    // No weight entered
    if (!weight) {
      return (
        <List.EmptyView
          title="Enter your working weight"
          description="Enter the weight for your warmup sets (e.g. 225)"
          icon={Icon.ExclamationMark}
        />
      );
    }

    // Check if no sets (indicating an error)
    if (sets.length === 0) {
      return (
        <List.EmptyView
          title="Invalid Input"
          description="Please enter a valid weight between the allowed range"
          icon={Icon.ExclamationMark}
        />
      );
    }

    // Has valid sets
    return sets.map((set) => (
      <WarmupItem
        key={set.setNumber}
        set={set}
        unitSystem={unitSystem}
        sets={sets}
        setShowingDetail={setShowingDetail}
      />
    ));
  };

  return (
    <List
      searchBarPlaceholder="Enter working weight"
      onSearchTextChange={handleSearchTextChange}
      searchText={weight}
      isShowingDetail={showingDetail}
    >
      {renderContent()}
    </List>
  );
};
