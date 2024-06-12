import React, { useState, useEffect } from 'react';
import { Detail, Grid, LaunchProps } from "@raycast/api";
import { IconItem } from "./utils/types";
import { nounProjectData } from "./utils/nounData";

interface IconSearchData {
  isLoading: boolean;
  status: string;
  data: {
    error: Error | null;
    generated_at: string;
    icons: IconItem[];
  };
}

export default function Command(props: LaunchProps) {
  const { keyword, publicDomain } = props.arguments;
  const [iconResponse, setIconResponse] = useState<JSX.Element>(<Detail isLoading={true} markdown="Loading..." />);
  
  useEffect(() => {
    nounProjectData(`icon?query=${keyword}&limit_to_public_domain=${publicDomain}`).then((response) => {
      const data = (response as IconSearchData).data;
      console.log(typeof(data))

      if (data.error) {
        setIconResponse(
          <Detail isLoading={false} markdown={`# Error: ${JSON.stringify(data.error)}`} />
        );
        return;
      }
      
      setIconResponse(
        <Grid 
          columns={6}
          isLoading={false}>
          {data.icons && data.icons.length === 0 && (
            <Grid.EmptyView icon='no-results.png' title="No icons found. Please try again." />
          )}
          {data.icons.map((icon: IconItem) => (
            <Grid.Item
              key={icon.id}
              content={icon.thumbnail_url}
              title={icon.term}
              subtitle={icon.attribution}
            />
          ))}
        </Grid>
      );
    }).catch((error) => {
      console.error("Error retrieving data:", error);
      setIconResponse(
        <Detail isLoading={false} markdown={`# Error: ${JSON.stringify(error)}`} />
      );
    });

  }, [keyword]);

  return iconResponse;
}
