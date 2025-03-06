import { useState } from "react";
import { FileType } from "../types";
import { useObservationsByType } from "../hooks/useObservationsByType";
import { Detail, List } from "@raycast/api";
import { ObservationFileTypeFilter } from "../components/ObservationFileTypeFilter";
import { fileTypes } from "../config";
import { ObservationListItem } from "../components/ObservationListItem";

export function ObservationsByTypeView() {
  const [fileTypeFilter, setFileTypeFilter] = useState<FileType>("jpg");

  const { isLoading, data, pagination, error } = useObservationsByType({ fileType: fileTypeFilter });
  const observations = data ?? [];

  if (error) {
    return <Detail markdown="Failed to load data, please try again later." />;
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarAccessory={
        <ObservationFileTypeFilter
          value={fileTypeFilter}
          options={fileTypes}
          onChange={(newFileTypeFilter) => setFileTypeFilter(newFileTypeFilter)}
        />
      }
    >
      {observations.map((observation, index) => {
        return <ObservationListItem key={observation.id} observation={observation} index={index} />;
      })}
    </List>
  );
}
