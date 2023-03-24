import { Grid } from "@raycast/api";
import { Tile } from "./tiles";
import { AppleMusicRecommendation } from "../types";
export default function Recommendations({ recommendations }: { recommendations: AppleMusicRecommendation[] }) {
  return (
    <>
      {recommendations.map((recommendation) => (
        <Grid.Section
          title={recommendation.attributes.title.stringForDisplay}
          subtitle={recommendation.attributes.reason?.stringForDisplay}
          columns={5}
          key={recommendation.id}
        >
          {recommendation.relationships.contents?.data.map((resource) => (
            <Tile key={resource.id} resource={resource} />
          ))}
        </Grid.Section>
      ))}
    </>
  );
}
