import { Detail, Icon, LaunchProps, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import ping from "ping";

export default function Command(props: LaunchProps) {
  const { domain } = props.arguments;

  const { data, isLoading, error } = usePromise(async () => {
    return await ping.promise.probe(domain, { min_reply: 3 });
  });

  if (isLoading) {
    return (
      <List>
        <List.EmptyView icon={Icon.AlarmRinging} title={`Pinging ${domain}`} />
      </List>
    );
  }

  if (error || !data) {
    return (
      <List>
        <List.EmptyView icon={Icon.Repeat} title="Something wrong happened. Try again." />
      </List>
    );
  }

  const { alive, output, time, times, min, max, avg, stddev, packetLoss } = data;

  if (!alive) {
    return (
      <List>
        <List.EmptyView icon={Icon.HeartDisabled} title="No heart beat!" />
      </List>
    );
  }

  const imageSrc = "alive.jpg"; // free unsplash image: https://unsplash.com/photos/-A_Sx8GrRWg
  const markdown = `
# ${alive ? "It is alive!" : "There is not heart bit!"}

<img src="${imageSrc}" alt="it is alive" style="width:100px" />

\`\`\`
  ${output}
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={domain}
      metadata={
        alive ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Domain" text={domain} />
            <Detail.Metadata.Label title="Output" text={output} />
            <Detail.Metadata.TagList title="Alive">
              <Detail.Metadata.TagList.Item text="True" color="green" />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Time" text={time.toString()} />
            <Detail.Metadata.Label title="Times" text={times.toString()} />
            <Detail.Metadata.Label title="Min" text={min.toString()} />
            <Detail.Metadata.Label title="Max" text={max.toString()} />
            <Detail.Metadata.Label title="Average" text={avg.toString()} />
            <Detail.Metadata.Label title="Standard Deviation" text={stddev.toString()} />
            <Detail.Metadata.Label title="Packet Loss" text={packetLoss.toString()} />
          </Detail.Metadata>
        ) : (
          <></>
        )
      }
    />
  );
}
