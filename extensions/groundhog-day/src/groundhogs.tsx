import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Groundhog, GroundhogsResponse } from "./types";
import { useState } from "react";

const API_URL = "https://groundhog-day.com/api/v1/";

export default function Groundhogs() {
    const [isShowingDetail, setIsShowingDetail] = useState(false);
    const { isLoading, data } = useFetch<GroundhogsResponse>(API_URL + "groundhogs");

    return <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
        {data?.groundhogs.map(groundhog => <List.Item key={groundhog.id} title={groundhog.name} icon={groundhog.predictions.at(-1)?.shadow===0 ? Icon.Sun : Icon.Snowflake} subtitle={isShowingDetail ? undefined : groundhog.region} accessories={isShowingDetail ? undefined : [{tag: groundhog.country}, { text: `${groundhog.predictionsCount} predictions` }]} detail={<List.Item.Detail markdown={`![Illustration](${groundhog.image})
${groundhog.description}

## Resides in
${groundhog.region}, ${groundhog.city}, ${groundhog.country}
`} metadata={<List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Name" text={groundhog.name} />
</List.Item.Detail.Metadata>} />} actions={<ActionPanel>
            <Action title="Toggle Details" icon={Icon.Sidebar} onAction={() => setIsShowingDetail(prev => !prev)} />
            <Action.Push title="View Details" icon={Icon.Document} target={<ViewDetails groundhog={groundhog} />} />
        </ActionPanel>} />)}
    </List>   
}

function ViewDetails({ groundhog }: { groundhog: Groundhog }) {
    return <Detail navigationTitle={groundhog.name} markdown={`![Illustration](${groundhog.image})
${groundhog.description}

## Resides in
${groundhog.region}, ${groundhog.city}, ${groundhog.country}
`} metadata={<Detail.Metadata>
    <Detail.Metadata.Label title="Past predictions" />
    {groundhog.predictions.toReversed().map(prediction => <Detail.Metadata.Label key={prediction.year} title={prediction.year.toString()} text={prediction.details} icon={prediction.shadow ? Icon.Snowflake : Icon.Sun} />)}
</Detail.Metadata>} />
}